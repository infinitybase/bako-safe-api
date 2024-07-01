import { IConfVault, Vault } from 'bakosafe';
import { Brackets } from 'typeorm';

import { NotFound } from '@src/utils/error';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate, Transaction } from '@models/index';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  IEndCursorPayload,
  IGetTxEndCursorQueryProps,
  IPredicateFilterParams,
  IPredicatePayload,
  IPredicateService,
} from './types';

import { Address, Provider, bn, getTransactionsSummaries } from 'fuels';
import axios, { AxiosResponse } from 'axios';
import { formatPayloadToCreateTransaction } from '../transaction/utils';
import { TransactionService } from '../transaction/services';

// const FAUCET_ADDRESS = [
//   '0xd205d74dc2a0ffd70458ef19f0fa81f05ac727e63bf671d344c590ab300e134f',
// ];
export class PredicateService implements IPredicateService {
  private _ordination: IOrdination<Predicate> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };
  private _pagination: PaginationParams;
  private _filter: IPredicateFilterParams;
  private predicateFieldsSelection = [
    'p.id',
    'p.createdAt',
    'p.deletedAt',
    'p.updatedAt',
    'p.name',
    'p.predicateAddress',
    'p.description',
    'p.minSigners',
    'p.owner',
    'p.provider',
    'p.chainId',
    'p.configurable',
  ];

  filter(filter: IPredicateFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Predicate>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(payload: IPredicatePayload): Promise<Predicate> {
    try {
      const predicate = await Predicate.create(payload).save();
      return predicate;
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate creation',
        detail: e,
      });
    }
  }

  async findById(id: string): Promise<Predicate> {
    try {
      return await Predicate.createQueryBuilder('p')
        .where({ id })
        .leftJoinAndSelect('p.members', 'members')
        .leftJoinAndSelect('p.owner', 'owner')
        .leftJoin('p.version', 'version')
        .leftJoin('p.workspace', 'workspace')
        .leftJoin('workspace.addressBook', 'addressBook')
        .leftJoin('addressBook.user', 'adb_workspace')
        .select([
          ...this.predicateFieldsSelection,
          'p.configurable',
          'members.id',
          'members.avatar',
          'members.address',
          'owner.id',
          'owner.address',
          'version.id',
          'version.abi',
          'version.bytes',
          'version.code',
          'workspace.id',
          'workspace.name',
          'addressBook.nickname',
          'addressBook.id',
          'addressBook.user_id',
          'adb_workspace.id',
        ])
        .getOne();
    } catch (e) {
      if (e instanceof GeneralError) {
        throw e;
      }

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findById',
        detail: e,
      });
    }
  }

  async getMissingDeposits(predicate: Predicate) {
    if (!predicate) {
      throw new NotFound({
        type: ErrorTypes.NotFound,
        title: 'Predicate not found',
        detail: `Predicate with id ${predicate.id} not found`,
      });
    }

    const predicateProvider = predicate.provider;
    const rawPredicateAddresss = Address.fromString(
      predicate.predicateAddress,
    ).toB256();

    const deposits = await this.getPredicateHistory(
      rawPredicateAddresss,
      predicateProvider,
    );

    const getPredicateTransactions = await Transaction.createQueryBuilder('t')
      .leftJoin('t.predicate', 'p')
      .select(['t.id', 't.hash', 'p.id', 't.createdAt'])
      .where('p.id = :predicate', {
        predicate: predicate.id,
      })
      .orderBy('t.createdAt', 'DESC')
      .take(5)
      .getMany();

    const missingDeposits = deposits.filter(
      deposit =>
        !getPredicateTransactions.some(
          transaction => transaction.hash === `${deposit.id.slice(2)}`,
        ),
    );

    for (const deposit of missingDeposits) {
      const formattedPayload = formatPayloadToCreateTransaction(
        deposit,
        predicate,
        rawPredicateAddresss,
      );

      await new TransactionService().create(formattedPayload);
    }
  }

  async getEndCursor(endCursorParams: IGetTxEndCursorQueryProps) {
    const { providerUrl, address, txQuantityRange } = endCursorParams;

    const getEndCursorQuery = `
     query Transactions($address: Address, $first: Int) {
      transactionsByOwner(owner: $address, first: $first) {
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
    `;

    const {
      data: { data },
    }: AxiosResponse<IEndCursorPayload> = await axios.post(providerUrl, {
      query: getEndCursorQuery,
      variables: { address, first: txQuantityRange },
    });
    const endCursor = data.transactionsByOwner.pageInfo.endCursor;
    const hasNextPage = data.transactionsByOwner.pageInfo.hasNextPage;

    return { endCursor, hasNextPage };
  }

  async getPredicateHistory(address: string, providerUrl: string) {
    const provider = await Provider.create(providerUrl);
    const { endCursor, hasNextPage } = await this.getEndCursor({
      providerUrl,
      address,
      txQuantityRange: 100,
    });

    const txSummaries = await getTransactionsSummaries({
      provider,
      filters: {
        owner: address,
        ...(hasNextPage ? { last: 5, before: endCursor } : { first: 5 }),
      },
    });

    const deposits = txSummaries.transactions.reduce((deposit, transaction) => {
      const operations = transaction?.operations.filter(
        filteredTx => filteredTx.to?.address === address,
        // &&
        // // these two last validation is due the faucet
        // !FAUCET_ADDRESS.includes(filteredTx.to?.address) &&
        // filteredTx.to?.address !== filteredTx.from?.address,
      );

      const {
        gasPrice,
        scriptGasLimit,
        script,
        scriptData,
        type,
        witnesses,
        outputs,
        inputs,
      } = transaction.transaction;

      if (operations.length > 0) {
        deposit.push({
          date: new Date(transaction.date),
          id: transaction.id,
          operations,
          gasUsed: transaction.gasUsed.format(),
          txData: {
            gasPrice,
            scriptGasLimit,
            script,
            scriptData,
            type,
            witnesses,
            outputs,
            inputs,
          },
        });
      }

      return deposit;
    }, []);

    return deposits;
  }

  async list(): Promise<IPagination<Predicate> | Predicate[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const hasOrdination = this._ordination?.orderBy && this._ordination?.sort;
    const queryBuilder = Predicate.createQueryBuilder('p')
      .select(this.predicateFieldsSelection)
      .innerJoin('p.members', 'members')
      .innerJoin('p.owner', 'owner')
      .innerJoin('p.workspace', 'workspace')
      .addSelect([
        'members.id',
        'members.address',
        'members.avatar',
        'owner.id',
        'owner.address',
        'owner.avatar',
        'workspace.id',
        'workspace.name',
        'workspace.permissions',
        'workspace.single',
        'workspace.avatar',
      ]);

    try {
      // Aplicar filtros
      if (this._filter.address) {
        queryBuilder.andWhere('p.predicateAddress = :predicateAddress', {
          predicateAddress: this._filter.address,
        });
      }

      if (this._filter.provider) {
        queryBuilder.andWhere('LOWER(p.provider) = LOWER(:provider)', {
          provider: `${this._filter.provider}`,
        });
      }

      if (this._filter.workspace && !this._filter.signer) {
        queryBuilder.andWhere(
          new Brackets(qb => {
            qb.orWhere('workspace.id IN (:...workspace)', {
              workspace: this._filter.workspace,
            });
          }),
        );
      }

      if (this._filter.name) {
        queryBuilder.andWhere('p.name = :name', {
          name: this._filter.name,
        });
      }

      if (this._filter.workspace || this._filter.signer) {
        queryBuilder.andWhere(
          new Brackets(qb => {
            if (this._filter.workspace) {
              qb.orWhere('workspace.id IN (:...workspace)', {
                workspace: this._filter.workspace,
              });
            }
            if (this._filter.signer) {
              qb.orWhere(subQb => {
                const subQuery = subQb
                  .subQuery()
                  .select('1')
                  .from('predicate_members', 'pm')
                  .where('pm.predicate_id = p.id')
                  .andWhere(
                    '(pm.user_id = (SELECT u.id FROM users u WHERE u.address = :signer))',
                    { signer: this._filter.signer },
                  )
                  .getQuery();
                return `EXISTS ${subQuery}`;
              });
            }
          }),
        );
      }

      if (this._filter.q) {
        queryBuilder.andWhere(
          new Brackets(qb =>
            qb
              .where('LOWER(p.name) LIKE LOWER(:name)', {
                name: `%${this._filter.q}%`,
              })
              .orWhere('LOWER(p.description) LIKE LOWER(:description)', {
                description: `%${this._filter.q}%`,
              }),
          ),
        );
      }

      // Aplicar ordenação
      if (hasOrdination) {
        queryBuilder.orderBy(
          `p.${this._ordination.orderBy}`,
          this._ordination.sort,
        );
      }

      // Paginação
      if (hasPagination) {
        return await Pagination.create(queryBuilder).paginate(this._pagination);
      } else {
        const predicates = await queryBuilder.getMany();
        return predicates ?? [];
      }
    } catch (e) {
      if (e instanceof GeneralError) {
        throw e;
      }

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate list',
        detail: e,
      });
    }
  }

  async update(id: string, payload?: IPredicatePayload): Promise<Predicate> {
    try {
      await Predicate.update(
        { id },
        {
          ...payload,
          updatedAt: new Date(),
        },
      );

      const updatedPredicate = await this.findById(id);

      if (!updatedPredicate) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with id ${id} not found after update`,
        });
      }

      return updatedPredicate;
    } catch (e) {
      if (e instanceof NotFound) throw e;
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate update',
        detail: e,
      });
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await Predicate.update({ id }, { deletedAt: new Date() });

      if (result.affected === 0) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with id ${id} not found`,
        });
      }

      return true;
    } catch (e) {
      if (e instanceof NotFound) {
        throw e;
      }

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate deletion',
        detail: e,
      });
    }
  }

  async instancePredicate(predicateId: string): Promise<Vault> {
    const predicate = await this.findById(predicateId);

    const configurable: IConfVault = {
      ...JSON.parse(predicate.configurable),
    };

    return Vault.create({
      configurable,
      version: predicate.version.code,
    });
  }
}

import { IWitnesses, TransactionStatus, Vault, WitnessStatus } from 'bakosafe';
import {
  Address,
  bn,
  getTransactionsSummaries,
  getTransactionSummary,
  Network,
  OutputType,
  transactionRequestify,
} from 'fuels';
import { Brackets, In, Not } from 'typeorm';

import { Predicate, Transaction } from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { IOrdination, setOrdination } from '@utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@utils/pagination';

import { FuelProvider } from '@src/utils';
import { NotificationService } from '../notification/services';
import { TransactionPagination, TransactionPaginationParams } from './pagination';
import {
  ICreateTransactionPayload,
  ITransactionAdvancedDetail,
  ITransactionFilterParams,
  ITransactionResponse,
  ITransactionService,
  IUpdateTransactionPayload,
} from './types';
import { formatFuelTransaction, formatTransactionsResponse } from './utils';

export class TransactionService implements ITransactionService {
  private _ordination: IOrdination<Transaction> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };
  private _pagination: PaginationParams;
  private _transactionPagination: TransactionPaginationParams;
  private _filter: ITransactionFilterParams;

  filter(filter: ITransactionFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  transactionPaginate(pagination?: TransactionPaginationParams) {
    this._transactionPagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Transaction>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(payload: ICreateTransactionPayload): Promise<ITransactionResponse> {
    return await Transaction.create(payload)
      .save()
      .then(transaction => Transaction.formatTransactionResponse(transaction))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction creation',
          detail: e,
        });
      });
  }

  async update(
    id: string,
    payload?: IUpdateTransactionPayload,
  ): Promise<ITransactionResponse> {
    if (payload.status && payload.resume) {
      payload.resume = { ...payload.resume, status: payload.status };
    }

    return await Transaction.update({ id }, payload)
      .then(async () => {
        return await this.findById(id);
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction update',
          detail: e,
        });
      });
  }

  async findByHash(hash: string): Promise<ITransactionResponse> {
    return await Transaction.findOne({
      where: { hash: hash, status: Not(TransactionStatus.DECLINED) },
      relations: [
        'predicate',
        'predicate.members',
        'predicate.workspace',
        'createdBy',
      ],
    })
      .then(transaction => {
        if (!transaction) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Transaction not found',
            detail: `No transaction was found for the provided hash: ${hash}.`,
          });
        }

        return Transaction.formatTransactionResponse(transaction);
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction findByHash',
          detail: e,
        });
      });
  }

  async findById(id: string): Promise<ITransactionResponse> {
    return await Transaction.findOne({
      where: { id },
      relations: [
        'predicate',
        'predicate.members',
        'predicate.workspace',
        'createdBy',
      ],
    })
      .then(transaction => {
        if (!transaction) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Transaction not found',
            detail: `No transaction was found for the provided ID: ${id}.`,
          });
        }

        return Transaction.formatTransactionResponse(transaction);
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction findById',
          detail: e,
        });
      });
  }

  //todo: melhorar a valocidade de processamento dessa query
  //caso trocar inner por left atrapalha muito a performance
  async list(): Promise<
    IPagination<ITransactionResponse> | ITransactionResponse[]
  > {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Transaction.createQueryBuilder('t')
      .select([
        't.createdAt',
        't.gasUsed',
        't.hash',
        't.id',
        't.name',
        't.predicateId',
        't.txData',
        't.resume',
        't.sendTime',
        't.status',
        't.summary',
        't.updatedAt',
        't.type',
        't.network',
      ])
      .leftJoin('t.predicate', 'predicate')
      .leftJoin('predicate.members', 'members')
      .leftJoin('predicate.workspace', 'workspace')
      .addSelect([
        'predicate.name',
        'predicate.id',
        'predicate.predicateAddress',
        'members.id',
        'members.avatar',
        'members.address',
        'workspace.id',
        'workspace.name',
        'workspace.single',
      ])
      .andWhere(
        // TODO: On release to mainnet we need to remove this condition
        `regexp_replace(t.network->>'url', '^https?://[^@]+@', 'https://') = :network`,
        {
          network: this._filter.network.replace(/^https?:\/\/[^@]+@/, 'https://'),
        },
      );

    this._filter.predicateAddress &&
      queryBuilder.andWhere('predicate.predicateAddress = :address', {
        address: this._filter.predicateAddress,
      });

    // =============== specific for workspace ===============
    if (this._filter.workspaceId || this._filter.signer) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          if (this._filter.workspaceId) {
            qb.orWhere('workspace.id IN (:...workspace)', {
              workspace: this._filter.workspaceId,
            });
          }
          if (this._filter.signer) {
            qb.orWhere('members.address = :signer', {
              signer: this._filter.signer,
            });
          }
        }),
      );
    }

    // =============== specific for home ===============

    this._filter.to &&
      queryBuilder.andWhere(
        `
        EXISTS (
        SELECT 1
        FROM jsonb_array_elements(t.tx_data->'outputs') AS output
        WHERE (output->>'type')::int = :outputType
          AND (output->>'to')::text = :filterTo
      )`,
        { outputType: OutputType.Coin, filterTo: this._filter.to },
      );

    this._filter.hash &&
      queryBuilder.andWhere('LOWER(t.hash) = LOWER(:hash)', {
        hash: this._filter.hash,
      });

    this._filter.predicateId &&
      this._filter.predicateId.length > 0 &&
      queryBuilder.andWhere('t.predicate_id IN (:...predicateID)', {
        predicateID: this._filter.predicateId,
      });

    this._filter.status &&
      queryBuilder.andWhere('t.status IN (:...status)', {
        status: this._filter.status,
      });

    this._filter.startDate &&
      queryBuilder.andWhere('t.createdAt >= :startDate', {
        startDate: this._filter.startDate,
      });

    this._filter.endDate &&
      queryBuilder.andWhere('t.createdAt <= :endDate', {
        endDate: this._filter.endDate,
      });

    this._filter.createdBy &&
      queryBuilder.andWhere('t.createdBy = :createdBy', {
        createdBy: this._filter.createdBy,
      });

    this._filter.name &&
      queryBuilder.andWhere('LOWER(t.name) LIKE LOWER(:name)', {
        name: `%${this._filter.name}%`,
      });
    this._filter.id &&
      queryBuilder.andWhere('t.id = :id', {
        id: this._filter.id,
      });

    this._filter.type &&
      queryBuilder.andWhere('t.type = :type', {
        type: this._filter.type,
      });

    /* *
     * TODO: Not best solution for performance, "take" dont limit this method
     *       just find all and create an array with length. The best way is use
     *       distinct select.
     *  */
    this._filter.limit && !hasPagination && queryBuilder.take(this._filter.limit);

    queryBuilder.orderBy(`t.${this._ordination.orderBy}`, this._ordination.sort);

    const handleInternalError = e => {
      if (e instanceof GeneralError) throw e;
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction list',
        detail: e,
      });
    };

    const transactions = hasPagination
      ? await Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(handleInternalError)
      : await queryBuilder
          .getMany()
          .then(transactions => {
            return transactions ?? [];
          })
          .catch(handleInternalError);

    const _transactions = formatTransactionsResponse(transactions);

    return _transactions;
  }

  async listWithIncomings(): Promise<ITransactionResponse[]> {
    const hasPagination =
      this._transactionPagination?.perPage && this._transactionPagination?.offsetDb;
    const queryBuilder = Transaction.createQueryBuilder('t')
      .select([
        't.createdAt',
        't.gasUsed',
        't.hash',
        't.id',
        't.name',
        't.predicateId',
        't.txData',
        't.resume',
        't.sendTime',
        't.status',
        't.summary',
        't.updatedAt',
        't.type',
        't.network',
      ])
      .leftJoin('t.predicate', 'predicate')
      .leftJoin('predicate.members', 'members')
      .leftJoin('predicate.workspace', 'workspace')
      .addSelect([
        'predicate.name',
        'predicate.id',
        'predicate.predicateAddress',
        'members.id',
        'members.avatar',
        'members.address',
        'workspace.id',
        'workspace.name',
        'workspace.single',
      ])
      .andWhere(
        `regexp_replace(t.network->>'url', '^https?://[^@]+@', 'https://') = :network`,
        {
          network: this._filter.network.replace(/^https?:\/\/[^@]+@/, 'https://'),
        },
      );

    // =============== specific for workspace ===============
    if (this._filter.workspaceId || this._filter.signer) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          if (this._filter.workspaceId) {
            qb.orWhere('workspace.id IN (:...workspace)', {
              workspace: this._filter.workspaceId,
            });
          }
          if (this._filter.signer) {
            qb.orWhere('members.address = :signer', {
              signer: this._filter.signer,
            });
          }
        }),
      );
    }

    // =============== specific for home ===============

    this._filter.predicateId &&
      this._filter.predicateId.length > 0 &&
      queryBuilder.andWhere('t.predicate_id IN (:...predicateID)', {
        predicateID: this._filter.predicateId,
      });

    this._filter.status &&
      queryBuilder.andWhere('t.status IN (:...status)', {
        status: this._filter.status,
      });

    this._filter.type &&
      queryBuilder.andWhere('t.type = :type', {
        type: this._filter.type,
      });

    this._filter.id &&
      queryBuilder.andWhere('t.id = :id', {
        id: this._filter.id,
      });

    queryBuilder.orderBy(`t.${this._ordination.orderBy}`, this._ordination.sort);

    const handleInternalError = e => {
      if (e instanceof GeneralError) throw e;
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction list',
        detail: e,
      });
    };

    const transactions = hasPagination
      ? await TransactionPagination.create(queryBuilder)
          .paginate(this._transactionPagination)
          .then(paginationResult => paginationResult)
          .catch(handleInternalError)
      : await queryBuilder
          .getMany()
          .then(transactions => {
            return transactions ?? [];
          })
          .catch(handleInternalError);

    return formatTransactionsResponse(transactions) as ITransactionResponse[];
  }

  async delete(id: string): Promise<boolean> {
    return await Transaction.update({ id }, { deletedAt: new Date() })
      .then(() => true)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction delete',
          detail: e,
        });
      });
  }

  async findAdvancedDetailById(id: string): Promise<ITransactionAdvancedDetail> {
    const transaction = await Transaction.findOne({
      where: { id },
      relations: { predicate: true },
    });

    if (!transaction) {
      throw new NotFound({
        type: ErrorTypes.NotFound,
        detail: `Transaction with id ${id} not found.`,
        title: 'Transaction not found',
      });
    }

    const commonResponse = {
      status: transaction.status,
      txRequest: transaction.txData,
    };

    if (transaction.status === TransactionStatus.FAILED) {
      const provider = await FuelProvider.create(
        transaction.network.url.replace(/^https?:\/\/[^@]+@/, 'https://'),
      );

      const vault = new Vault(
        provider,
        JSON.parse(transaction.predicate.configurable),
        transaction.predicate.version,
      );

      const assetId = await provider.getBaseAssetId();

      const resources = vault.generateFakeResources([
        {
          amount: bn(1),
          assetId,
        },
      ]);

      const txRequest = transactionRequestify(transaction.txData);

      txRequest.addResources(resources);

      const { receipts } = await provider.dryRun(txRequest);

      return { ...commonResponse, receipts };
    }

    return commonResponse;
  }

  validateStatus(
    transaction: Transaction,
    witnesses: IWitnesses[],
  ): TransactionStatus {
    const witness: {
      DONE: number;
      REJECTED: number;
      PENDING: number;
    } = {
      DONE: 0,
      REJECTED: 0,
      PENDING: 0,
    };
    const { requiredSigners } = transaction.resume;

    witnesses.map((item: IWitnesses) => {
      witness[item.status]++;
    });
    const totalSigners =
      witness[WitnessStatus.DONE] +
      witness[WitnessStatus.REJECTED] +
      witness[WitnessStatus.PENDING];

    if (
      transaction.status === TransactionStatus.SUCCESS ||
      transaction.status === TransactionStatus.FAILED ||
      transaction.status === TransactionStatus.PROCESS_ON_CHAIN
    ) {
      return transaction.status;
    }

    if (witness[WitnessStatus.DONE] >= requiredSigners) {
      return TransactionStatus.PENDING_SENDER;
    }

    if (totalSigners - witness[WitnessStatus.REJECTED] < requiredSigners) {
      return TransactionStatus.DECLINED;
    }

    return TransactionStatus.AWAIT_REQUIREMENTS;
  }

  checkInvalidConditions(status: TransactionStatus) {
    const invalidConditions =
      !status ||
      status === TransactionStatus.AWAIT_REQUIREMENTS ||
      status === TransactionStatus.SUCCESS;

    if (invalidConditions) {
      throw new NotFound({
        type: ErrorTypes.NotFound,
        title: 'Error on transaction list',
        detail: 'No transactions found with the provided params',
      });
    }
  }

  //instance vault
  //instance tx
  //add witnesses
  async sendToChain(hash: string, network: Network) {
    const transaction = await Transaction.findOne({
      where: {
        hash,
        status: Not(In([TransactionStatus.DECLINED, TransactionStatus.FAILED])),
      },
      relations: ['predicate', 'createdBy'],
    });

    if (!transaction) {
      throw new NotFound({
        type: ErrorTypes.NotFound,
        title: 'Transaction not found',
        detail: `No transaction were found that were ready to be sent to the provided hash: ${hash}.`,
      });
    }

    const { id, predicate, txData, status, resume } = transaction;

    if (status != TransactionStatus.PENDING_SENDER) {
      return await this.findById(id);
    }

    const provider = await FuelProvider.create(
      transaction.network.url.replace(/^https?:\/\/[^@]+@/, 'https://'),
    );

    const vault = new Vault(
      provider,
      JSON.parse(predicate.configurable),
      predicate.version,
    );

    const tx = transactionRequestify({
      ...txData,
      witnesses: transaction.getWitnesses(),
    });

    try {
      const transactionResponse = await vault.send(tx);
      const { gasUsed } = await transactionResponse.waitForResult();

      const _api_transaction: IUpdateTransactionPayload = {
        status: TransactionStatus.SUCCESS,
        sendTime: new Date(),
        gasUsed: gasUsed.format(),
        resume: {
          ...resume,
          gasUsed: gasUsed.format(),
          status: TransactionStatus.SUCCESS,
        },
      };

      await new NotificationService().transactionSuccess(id, network);

      return await this.update(id, _api_transaction);
    } catch (e) {
      const error = 'toObject' in e ? e.toObject() : e;
      const _api_transaction: IUpdateTransactionPayload = {
        status: TransactionStatus.FAILED,
        sendTime: new Date(),
        gasUsed: '0.0',
        resume: {
          ...resume,
          gasUsed: '0.0',
          status: TransactionStatus.FAILED,
          error,
        },
      };
      return await this.update(id, _api_transaction);
    }
  }

  async fetchFuelTransactions(
    predicates: Predicate[],
    providerUrl: string,
  ): Promise<ITransactionResponse[]> {
    try {
      let _transactions: ITransactionResponse[] = [];

      for await (const predicate of predicates) {
        const address = Address.fromString(predicate.predicateAddress).toB256();
        const provider = await FuelProvider.create(providerUrl);

        // TODO: change this to use pagination and order DESC
        const { transactions } = await getTransactionsSummaries({
          provider,
          filters: {
            owner: address,
            first: 57,
          },
        });

        // Filter only successful transactions and operations whose receiver is the predicate address
        const filteredTransactions = transactions
          .filter(tx => tx.isStatusSuccess)
          .filter(tx => tx.operations.some(op => op.to?.address === address));

        // formatFueLTransactio needs to be async because of the request to get fuels tokens up to date and use them to get the network units
        const formattedTransactions = await Promise.all(
          filteredTransactions.map(tx =>
            formatFuelTransaction(tx, predicate, provider),
          ),
        );

        _transactions = [..._transactions, ...formattedTransactions];
      }

      return _transactions;
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction fetchFuelTransactions',
        detail: e,
      });
    }
  }

  async fetchFuelTransactionById(
    id: string,
    predicate: Predicate,
    providerUrl: string,
  ): Promise<ITransactionResponse> {
    try {
      const provider = await FuelProvider.create(providerUrl);

      const tx = await getTransactionSummary({
        id,
        provider,
      });

      return formatFuelTransaction(tx, predicate, provider);
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction fetchFuelTransactionById',
        detail: e,
      });
    }
  }

  validateSignature(transaction: Transaction, userAddress: string): boolean {
    const {
      resume: { witnesses },
      hash,
    } = transaction;
    const hasWitness = witnesses.find(w => w.account === userAddress);
    const validStatus = hasWitness?.status === WitnessStatus.PENDING;

    return validStatus;
  }

  listAll() {
    const queryBuilder = Transaction.createQueryBuilder('t')
      .select([
        't.id',
        't.hash',
        't.predicateId',
        't.network',
        't.summary',
        'u.id',
        't.status',
      ])
      .innerJoin('t.createdBy', 'u');

    return Pagination.create(queryBuilder).paginate(this._pagination);
  }
}

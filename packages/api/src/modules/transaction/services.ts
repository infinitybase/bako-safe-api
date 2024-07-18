import {
  ITransactionResume,
  TransactionProcessStatus,
  TransactionStatus,
  Transfer,
  Vault,
} from 'bakosafe';
import {
  hexlify,
  Provider,
  TransactionRequest,
  transactionRequestify,
  TransactionResponse,
  TransactionType,
} from 'fuels';
import { Brackets } from 'typeorm';

import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';

import {
  NotificationTitle,
  Transaction,
  Witness,
  WitnessesStatus,
} from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { IOrdination, setOrdination } from '@utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@utils/pagination';

import { NotificationService } from '../notification/services';
import {
  ICreateTransactionPayload,
  ITransactionFilterParams,
  ITransactionService,
  ITransactionsGroupedByMonth,
  IUpdateTransactionPayload,
} from './types';
import { groupedTransactions } from './utils';

export class TransactionService implements ITransactionService {
  private _ordination: IOrdination<Transaction> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };
  private _pagination: PaginationParams;
  private _filter: ITransactionFilterParams;

  filter(filter: ITransactionFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Transaction>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(payload: ICreateTransactionPayload): Promise<Transaction> {
    return await Transaction.create(payload)
      .save()
      .then(transaction => transaction)
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
  ): Promise<Transaction> {
    return await Transaction.update({ id }, payload)
      .then(async () => await this.findById(id))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction update',
          detail: e,
        });
      });
  }

  async findById(id: string): Promise<Transaction> {
    return await Transaction.findOne({
      where: { id },
      relations: [
        'assets',
        'witnesses',
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

        return transaction;
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
    | IPagination<Transaction>
    | Transaction[]
    | IPagination<ITransactionsGroupedByMonth>
    | ITransactionsGroupedByMonth
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
        't.resume',
        't.sendTime',
        't.status',
        't.summary',
        't.updatedAt',
        't.type',
      ])
      .leftJoin('t.assets', 'assets')
      .leftJoin('t.witnesses', 'witnesses')
      .leftJoin('t.predicate', 'predicate')
      .leftJoin('predicate.members', 'members')
      .leftJoin('predicate.workspace', 'workspace')
      .addSelect([
        'predicate.name',
        'predicate.id',
        'predicate.minSigners',
        'predicate.predicateAddress',
        'witnesses.id',
        'witnesses.account',
        'witnesses.signature',
        'witnesses.status',
        'assets.id',
        'assets.amount',
        'assets.to',
        'assets.assetId',
        'members.id',
        'members.avatar',
        'members.address',
        'workspace.id',
        'workspace.name',
        'workspace.single',
      ]);

    this._filter.predicateAddress &&
      queryBuilder.andWhere('predicate.predicateAddress = :address', {
        address: this._filter.predicateAddress,
      });

    // =============== specific for workspace ===============
    if (this._filter.workspaceId || this._filter.signer) {
      queryBuilder.andWhere(new Brackets(qb => {
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
      }));
    }
  
    // =============== specific for home ===============

    this._filter.to &&
      queryBuilder
        .innerJoin('t.assets', 'asset')
        .andWhere('asset.to = :to', { to: this._filter.to });

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

    return this._filter.byMonth ? groupedTransactions(transactions) : transactions;
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

  async validateStatus(transactionId: string): Promise<TransactionStatus> {
    return await Transaction.createQueryBuilder('t')
      .where('t.id = :id', { id: transactionId })
      .leftJoin('t.witnesses', 'witnesses')
      .leftJoin('t.predicate', 'predicate')
      .addSelect(['witnesses.status', 'predicate.minSigners'])
      .getOne()
      .then((transaction: Transaction) => {
        const witness: {
          DONE: number;
          REJECTED: number;
          PENDING: number;
        } = {
          DONE: 0,
          REJECTED: 0,
          PENDING: 0,
        };
        transaction.witnesses.map((item: Witness) => {
          witness[item.status]++;
        });
        const totalSigners =
          witness[WitnessesStatus.DONE] +
          witness[WitnessesStatus.REJECTED] +
          witness[WitnessesStatus.PENDING];

        if (
          transaction.status === TransactionStatus.SUCCESS ||
          transaction.status === TransactionStatus.FAILED ||
          transaction.status === TransactionStatus.PROCESS_ON_CHAIN
        ) {
          return transaction.status;
        }

        if (witness[WitnessesStatus.DONE] >= transaction.predicate.minSigners) {
          return TransactionStatus.PENDING_SENDER;
        }

        if (
          totalSigners - witness[WitnessesStatus.REJECTED] <
          transaction.predicate.minSigners
        ) {
          return TransactionStatus.DECLINED;
        }

        return TransactionStatus.AWAIT_REQUIREMENTS;
      })
      .catch(e => {
        console.log(e)
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction validateStatus',
          detail: e,
        });
      });
  }

  async instanceTransactionScript(
    tx_data: TransactionRequest,
    vault: Vault,
    witnesses: string[],
  ): Promise<Transfer> {
    return await vault.BakoSafeIncludeTransaction({
      ...tx_data,
      witnesses,
    });
  }

  checkInvalidConditions(api_transaction: Transaction) {
    const invalidConditions =
      !api_transaction ||
      api_transaction.status === TransactionStatus.AWAIT_REQUIREMENTS ||
      api_transaction.status === TransactionStatus.SUCCESS;

    if (invalidConditions) {
      throw new NotFound({
        type: ErrorTypes.NotFound,
        title: 'Error on transaction list',
        detail: 'No transactions found with the provided params',
      });
    }
  }

  async sendToChain(bsafe_txid: string) {
    const api_transaction = await this.findById(bsafe_txid);
    const { predicate, txData, witnesses } = api_transaction;
    const provider = await Provider.create(predicate.provider);
    let _witnesses = witnesses
      .filter(w => !!w.signature)
      .map(witness => witness.signature);

    if (txData.type === TransactionType.Create) {
      _witnesses = [
        hexlify(txData.witnesses[txData.bytecodeWitnessIndex]),
        ..._witnesses,
      ];
    }

    const tx = transactionRequestify({
      ...txData,
      witnesses: _witnesses,
    });

    this.checkInvalidConditions(api_transaction);

    const tx_est = await provider.estimatePredicates(tx);

    const encodedTransaction = hexlify(tx_est.toTransactionBytes());
    return await provider.operations
      .submit({ encodedTransaction })
      .then(async response => {
        const transaction = await new TransactionResponse(
          response.submit.id,
          provider,
        ).waitForResult();
        const resume: ITransactionResume = {
          ...api_transaction.resume,
          witnesses: _witnesses,
          hash: response.submit.id.substring(2),
          // max_fee * gasUsed
          gasUsed: transaction.fee.format({ precision: 9 }),
          status: TransactionStatus.PROCESS_ON_CHAIN,
        };

        return resume;
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction sendToChain',
          detail: 'Error on transaction sendToChain',
        });
      });
  }

  async verifyOnChain(api_transaction: Transaction, provider: Provider) {
    const idOnChain = `0x${api_transaction.hash}`;
    const sender = new TransactionResponse(idOnChain, provider);
    const result = await sender.fetch();

    if (result.status.type === TransactionProcessStatus.SUBMITED) {
      return api_transaction.resume;
    } else if (
      result.status.type === TransactionProcessStatus.SUCCESS ||
      result.status.type === TransactionProcessStatus.FAILED
    ) {
      const { fee } = await sender.waitForResult();
      const gasUsed = fee.format({ precision: 9 });

      const resume = {
        ...api_transaction.resume,
        status:
          result.status.type === TransactionProcessStatus.SUCCESS
            ? TransactionStatus.SUCCESS
            : TransactionStatus.FAILED,
      };
      const _api_transaction: IUpdateTransactionPayload = {
        status: resume.status,
        sendTime: new Date(),
        gasUsed,
        resume: {
          ...resume,
          gasUsed,
        },
      };

      await this.update(api_transaction.id, _api_transaction);

      // NOTIFY MEMBERS ON TRANSACTIONS SUCCESS
      const notificationService = new NotificationService();

      const summary = {
        vaultId: api_transaction.predicate.id,
        vaultName: api_transaction.predicate.name,
        transactionId: api_transaction.id,
        transactionName: api_transaction.name,
        workspaceId: api_transaction.predicate.workspace.id,
      };

      if (result.status.type === TransactionProcessStatus.SUCCESS) {
        for await (const member of api_transaction.predicate.members) {
          await notificationService.create({
            title: NotificationTitle.TRANSACTION_COMPLETED,
            summary,
            user_id: member.id,
          });

          if (member.notify) {
            await sendMail(EmailTemplateType.TRANSACTION_COMPLETED, {
              to: member.email,
              data: { summary: { ...summary, name: member?.name ?? '' } },
            });
          }
        }
      }
      return resume;
    }

    return api_transaction.resume;
  }
}

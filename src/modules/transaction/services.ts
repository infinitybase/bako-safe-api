import {
  Transfer,
  Vault,
  TransactionProcessStatus,
  TransactionStatus,
  ITransactionResume,
} from 'bsafe';
import {
  Provider,
  TransactionRequest,
  TransactionResponse,
  hexlify,
  transactionRequestify,
} from 'fuels';

import {
  Notification,
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
  IUpdateTransactionPayload,
} from './types';

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
      relations: ['assets', 'witnesses', 'predicate', 'predicate.members'],
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

  async list(): Promise<IPagination<Transaction> | Transaction[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Transaction.createQueryBuilder('t').select([
      't.createdAt',
      't.gasUsed',
      't.hash',
      't.createdAt',
      't.id',
      't.name',
      't.predicateId',
      't.resume',
      't.sendTime',
      't.status',
      't.summary',
      't.updatedAt',
    ]);

    this._filter.predicateAddress &&
      this._filter.predicateAddress.length > 0 &&
      queryBuilder.andWhere('t.predicate.predicateAddress IN (:...address)', {
        address: this._filter.predicateAddress,
      });

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

    this._filter.limit && !hasPagination && queryBuilder.limit(this._filter.limit);

    queryBuilder
      .leftJoinAndSelect('t.assets', 'assets')
      .leftJoinAndSelect('t.witnesses', 'witnesses')
      .innerJoin('t.predicate', 'predicate')
      .addSelect([
        'predicate.name',
        'predicate.id',
        'predicate.minSigners',
        'predicate.predicateAddress',
      ])
      .innerJoin('predicate.members', 'members')
      .addSelect(['members.id', 'members.avatar', 'members.address'])
      .orderBy(`t.${this._ordination.orderBy}`, this._ordination.sort);

    const handleInternalError = e => {
      if (e instanceof GeneralError) throw e;
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction list',
        detail: e,
      });
    };

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(handleInternalError)
      : queryBuilder
          .getMany()
          .then(transactions => {
            return transactions ?? [];
          })
          .catch(handleInternalError);
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
    return await this.findById(transactionId)
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
    return await vault.BSAFEIncludeTransaction({
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
    const _witnesses = witnesses
      .filter(w => !!w.signature)
      .map(witness => witness.signature);
    txData.witnesses = witnesses.map(witness => witness.signature).filter(w => !!w);

    const tx = transactionRequestify({
      ...txData,
      witnesses: _witnesses,
    });

    this.checkInvalidConditions(api_transaction);

    const tx_est = await provider.estimatePredicates(tx);
    const coast = await provider.getTransactionCost(tx_est);

    const encodedTransaction = hexlify(tx_est.toTransactionBytes());
    return await provider.operations
      .submit({ encodedTransaction })
      .then(({ submit: { id: transactionId } }) => {
        const resume: ITransactionResume = {
          ...api_transaction.resume,
          witnesses: _witnesses,
          hash: transactionId.substring(2),
          // max_fee * gasUsed
          gasUsed: (
            parseFloat(coast.maxFee.format({ precision: 12 })) *
            parseFloat(coast.gasPrice.format({ precision: 12 }))
          )
            .toFixed(12)
            .toString(),
          status: TransactionStatus.PROCESS_ON_CHAIN,
        };
        console.log('[ENVIADO]', resume);
        return resume;
      })
      .catch(e => {
        console.log('[ERRO AO ENVIAR]', e);
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

    // console.log('[VERIFY_ON_CHAIN] result:', result.status.type);
    // console.log('[LÓGICAS]: ', {
    //   enviado:
    //     result.status.type === TransactionProcessStatus.SUCCESS ||
    //     result.status.type === TransactionProcessStatus.FAILED,
    // });

    if (result.status.type === TransactionProcessStatus.SUBMITED) {
      return api_transaction.resume;
    } else if (
      result.status.type === TransactionProcessStatus.SUCCESS ||
      result.status.type === TransactionProcessStatus.FAILED
    ) {
      const transactionCoast = (
        parseFloat(api_transaction.resume.gasUsed) *
        parseFloat(result.gasPrice) *
        result.receipts
          .map(item =>
            item.receiptType === 'SCRIPT_RESULT' ? parseFloat(item.gasUsed) : 0,
          )
          .reduce((a, b) => a + b, 0)
      )
        .toFixed(9)
        .toString();

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
        gasUsed: transactionCoast,
        resume: {
          ...resume,
          gasUsed: transactionCoast,
        },
      };

      await this.update(api_transaction.id, _api_transaction);

      // NOTIFY MEMBERS ON TRANSACTIONS SUCCESS
      const notificationService = new NotificationService();

      if (result.status.type === TransactionProcessStatus.SUCCESS) {
        for await (const member of api_transaction.predicate.members) {
          await notificationService.create({
            title: NotificationTitle.TRANSACTION_COMPLETED,
            summary: {
              vaultId: api_transaction.predicate.id,
              vaultName: api_transaction.predicate.name,
              transactionId: api_transaction.id,
              transactionName: api_transaction.name,
            },
            user_id: member.id,
          });
        }
      }

      //console.log('[DENTRO_ELSE_IF]', _api_transaction, resume, a);
      return resume;
    }

    return api_transaction.resume;
  }
}

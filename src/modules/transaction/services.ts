import { predicate } from '@mocks/predicate';

import {
  Transaction,
  TransactionStatus,
  Witness,
  WitnessesStatus,
} from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { IOrdination, setOrdination } from '@utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@utils/pagination';

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
  private nativeAssetId =
    '0x000000000000000000000000000000000000000000000000000000';
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
    return Transaction.create(payload)
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
    return Transaction.update({ id }, payload)
      .then(() => this.findById(id))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction update',
          detail: e,
        });
      });
  }

  async findById(id: string): Promise<Transaction> {
    return Transaction.findOne({
      where: { id },
      relations: ['assets', 'witnesses', 'predicate'],
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
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction findById',
          detail: e,
        });
      });
  }

  async list(): Promise<IPagination<Transaction> | Transaction[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Transaction.createQueryBuilder('t').select();

    this._filter.predicateId &&
      this._filter.predicateId.length &&
      queryBuilder.andWhere('t.predicateID IN (:...predicates)', {
        predicates: this._filter.predicateId,
      });
    this._filter.to &&
      queryBuilder
        .innerJoin('t.assets', 'asset')
        .andWhere('asset.to = :to', { to: this._filter.to });

    this._filter.hash &&
      queryBuilder.andWhere('LOWER(t.hash) = LOWER(:hash)', {
        hash: this._filter.hash,
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
      queryBuilder.where('LOWER(t.name) LIKE LOWER(:name)', {
        name: `%${this._filter.name}%`,
      });

    this._filter.limit && !hasPagination && queryBuilder.limit(this._filter.limit);

    queryBuilder
      .leftJoinAndSelect('t.assets', 'assets')
      .leftJoinAndSelect('t.witnesses', 'witnesses')
      .leftJoinAndSelect('t.predicate', 'predicate')
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
    return Transaction.update({ id }, { deletedAt: new Date() })
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

        if (witness[WitnessesStatus.DONE] >= transaction.predicate.minSigners) {
          return TransactionStatus.PENDING;
        }

        if (
          totalSigners - witness[WitnessesStatus.REJECTED] <
          transaction.predicate.minSigners
        ) {
          return TransactionStatus.REJECTED;
        }

        return TransactionStatus.AWAIT;
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction validateStatus',
          detail: e,
        });
      });
  }
}

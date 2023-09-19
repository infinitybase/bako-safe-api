import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Transaction } from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { IOrdination, setOrdination } from '@utils/ordination';

import {
  ICreateTransactionPayload,
  ITransactionService,
  IUpdateTransactionPayload,
  ITransactionFilterParams,
} from './types';

export class TransactionService implements ITransactionService {
  private _ordination: IOrdination<Transaction>;
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
    // TODO: quando criada a transacao, ja inserir na tabela witnesses com uma coluna de status
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
    payload: IUpdateTransactionPayload,
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
    const hasPagination = this._pagination.page && this._pagination.perPage;
    const queryBuilder = Transaction.createQueryBuilder('t').select();

    const handleInternalError = e => {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction list',
        detail: e,
      });
    };

    this._filter.predicateId &&
      queryBuilder.where({ predicateID: this._filter.predicateId });

    this._filter.to &&
      queryBuilder
        .innerJoin('t.assets', 'asset')
        .where('asset.to = :to', { to: this._filter.to });

    queryBuilder
      .leftJoinAndSelect('t.assets', 'assets')
      .leftJoinAndSelect('t.witnesses', 'witnesses')
      .orderBy(`t.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(e => handleInternalError(e))
      : queryBuilder
          .getMany()
          .then(transactions => {
            if (!transactions.length) {
              throw new NotFound({
                type: ErrorTypes.NotFound,
                title: 'Transactions not found',
                detail: `No transactions were found with the provided params.`,
              });
            }
            return transactions;
          })
          .catch(e => handleInternalError(e));
  }

  async delete(id: string): Promise<boolean> {
    return Transaction.update({ id }, { deletedAt: new Date() })
      .then(() => true)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction update',
          detail: e,
        });
      });
  }
}

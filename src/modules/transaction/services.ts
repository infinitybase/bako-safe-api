import { NotFound } from '@src/utils/error';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate, Transaction, Witness } from '@models/index';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  IAddTransactionPayload,
  ICloseTransactionPayload,
  ISignerByIdPayload,
  ITransactionService,
  allowedStatus,
} from './types';

export class TransactionService implements ITransactionService {
  private _ordination: IOrdination<Transaction>;
  private _pagination: PaginationParams;

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Transaction>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async add(payload: IAddTransactionPayload): Promise<Transaction> {
    return Transaction.create(payload)
      .save()
      .then(transaction => {
        return transaction;
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction creation',
          detail: e,
        });
      });
  }

  async findAll(): Promise<IPagination<Transaction> | Transaction[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Transaction.createQueryBuilder('t').select();

    queryBuilder
      .leftJoinAndSelect('t.assets', 'assets')
      .leftJoinAndSelect('t.witnesses', 'witnesses')
      .leftJoinAndSelect('t.predicate', 'predicates')
      .orderBy(`t.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(e => {
            console.log(e);
            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on transactions findAll',
              detail: e,
            });
          })
      : queryBuilder

          .getMany()
          .then(transactions => transactions)
          .catch(e => {
            console.log(e);
            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on transactions findAll',
              detail: e,
            });
          });
  }

  async findById(id: number): Promise<Transaction> {
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
        if (e instanceof GeneralError) {
          throw e;
        }

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction findById',
          detail: e,
        });
      });
  }

  async findByPredicateId(
    predicateId: number,
  ): Promise<IPagination<Transaction> | Transaction[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Transaction.createQueryBuilder('t').select();

    if (predicateId) {
      queryBuilder.where({ predicateID: predicateId });
    }

    queryBuilder
      .leftJoinAndSelect('t.assets', 'assets')
      .leftJoinAndSelect('t.witnesses', 'witnesses')
      .orderBy(`t.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(e => {
            console.log(e);
            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on transaction findByPredicateId',
              detail: e,
            });
          })
      : queryBuilder
          .getMany()
          .then(transactions => {
            if (!transactions.length) {
              throw new NotFound({
                type: ErrorTypes.NotFound,
                title: 'Transactions not found',
                detail: `No transactions were found for the provided predicate's id.`,
              });
            }

            return transactions;
          })
          .catch(e => {
            if (e instanceof GeneralError) {
              throw e;
            }

            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on transaction findByPredicateId',
              detail: e,
            });
          });
  }

  async findByTo(to: string): Promise<IPagination<Transaction> | Transaction[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Transaction.createQueryBuilder('t').select();

    queryBuilder
      .innerJoin('t.assets', 'asset')
      .where('asset.to = :to', { to })
      .leftJoinAndSelect('t.assets', 'assets')
      .leftJoinAndSelect('t.witnesses', 'witnesses')
      .orderBy(`t.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(e => {
            console.log(e);
            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on transactions findByTo',
              detail: e,
            });
          })
      : queryBuilder
          .getMany()
          .then(transactions => {
            if (!transactions.length) {
              throw new NotFound({
                type: ErrorTypes.NotFound,
                title: 'Transaction not found',
                detail: `No transaction was found for the provided ID.`,
              });
            }
            return transactions;
          })
          .catch(e => {
            console.log(e);

            if (e instanceof GeneralError) {
              throw e;
            }

            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on transactions findByTo',
              detail: e,
            });
          });

    // try {
    //   const transactions = await getConnection()
    //     .createQueryBuilder()
    //     .select('transaction')
    //     .from(Transaction, 'transaction')
    //     .innerJoin('transaction.assets', 'asset')
    //     .where('asset.to = :to', { to })
    //     .leftJoinAndSelect('transaction.assets', 'assets')
    //     .leftJoinAndSelect('transaction.witnesses', 'witnesses')
    //     .getMany();

    //   return transactions;
    // } catch (e) {
    //   throw new Internal({
    //     type: ErrorTypes.Internal,
    //     title: 'Error on transactions findByTo',
    //     detail: e,
    //   });
    // }
  }

  async close(id: number, payload: ICloseTransactionPayload): Promise<Transaction> {
    return Transaction.create({ ...payload, id })
      .save()
      .then(async () => {
        return Transaction.findOne({ where: { id } }).then(updated => updated);
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction closing',
          detail: e,
        });
      });
  }

  async signerByID(id: number, payload: ISignerByIdPayload): Promise<Transaction> {
    let statusField: string;

    return Transaction.findOne({
      where: { id },
      relations: ['assets', 'witnesses', 'predicate'],
    })
      .then(async transaction =>
        Predicate.findOne({ where: { id: transaction.predicateID } })
          .then(predicate => {
            const status =
              Number(predicate.minSigners) <= transaction.witnesses.length + 1;
            statusField = status ? allowedStatus[0] : allowedStatus[2];

            Witness.create({
              signature: payload.signer,
              account: payload.account,
              transactionID: id,
            }).save();
          })
          .then(() =>
            Transaction.create({
              id,
              status: statusField,
            }).save(),
          )
          .then(() =>
            Transaction.findOne({
              where: { id },
              relations: ['assets', 'witnesses', 'predicate'],
            }),
          ),
      )
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction signerByID',
          detail: e,
        });
      });
  }
}

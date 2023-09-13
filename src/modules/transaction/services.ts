import { getConnection } from 'typeorm';

import { IOrdination, setOrdination } from '@src/utils/ordination';

import { Predicate, Transaction } from '@models/index';

import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { Unauthorized } from '@utils/error/Unauthorized';

import {
  IAddTransactionPayload,
  ICloseTransactionPayload,
  ITransactionService,
} from './types';

export class TransactionService implements ITransactionService {
  private _ordination: IOrdination<Transaction>;

  async add(payload: IAddTransactionPayload): Promise<Transaction> {
    try {
      const transaction = await Transaction.create(payload).save();

      return transaction;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction creation',
        detail: e,
      });
    }
  }

  async findAll(): Promise<Transaction[]> {
    try {
      const transactions = await Transaction.find({
        relations: ['assets', 'witnesses'],
      });

      return transactions;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transactions findAll',
        detail: e,
      });
    }
  }

  async findById(id: number): Promise<Transaction> {
    try {
      const transaction = await Transaction.findOne({
        where: { id },
        relations: ['assets', 'witnesses'],
      });

      return transaction;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction findById',
        detail: e,
      });
    }
  }

  async findByPredicateId(predicateId: number): Promise<Transaction[]> {
    try {
      const transactions = await Transaction.find({
        where: { predicateID: predicateId },
        relations: ['assets', 'witnesses'],
      });

      return transactions;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transactions findByPredicateId',
        detail: e,
      });
    }
  }

  async findByTo(to: string): Promise<Transaction[]> {
    try {
      const transactions = await getConnection()
        .createQueryBuilder()
        .select('transaction')
        .from(Transaction, 'transaction')
        .innerJoin('transaction.assets', 'asset')
        .where('asset.to = :to', { to })
        .leftJoinAndSelect('transaction.assets', 'assets')
        .leftJoinAndSelect('transaction.witnesses', 'witnesses')
        .getMany();

      return transactions;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transactions findByTo',
        detail: e,
      });
    }
  }

  async close(id: number, payload: ICloseTransactionPayload): Promise<Transaction> {
    try {
      await Transaction.create({ ...payload, id }).save();

      const updated = await Transaction.findOne({ where: { id } });
      return updated;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on transaction closing',
        detail: e,
      });
    }
  }

  // async findByAdresses(addresses: string[]): Promise<Predicate> {
  //   try {
  //     const predicate = await Predicate.findOne({
  //       where: {
  //         addresses,
  //       },
  //     });

  //     return predicate;
  //   } catch (e) {
  //     if (e instanceof Unauthorized) {
  //       throw e;
  //     }
  //     throw new Internal({
  //       type: ErrorTypes.Internal,
  //       title: 'Error on predicate findByAdresses',
  //       detail: e,
  //     });
  //   }
  // }

  ordination(ordination: IOrdination<Transaction>) {
    this._ordination = setOrdination(ordination);
    return this;
  }
}

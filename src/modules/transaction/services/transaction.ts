import { TransactionStatus, TransactionType } from 'bakosafe';
import { Request } from 'express';
import { FindManyOptions, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

import { SortOptionTx } from '@/modules/core/models';
import { Predicate } from '@/modules/predicate/entity';
import { User } from '@/modules/user/entity';
import { Workspace } from '@/modules/workspace/entity';

import { Transaction } from '../entity';
import { TransactionOrderBy } from '../types';

export interface GetTransactionParams {
  predicateId?: string[];
  hash?: string[];
  id?: string;
  status?: TransactionStatus[];
  type?: TransactionType;
  to?: string[];
  orderBy?: TransactionOrderBy;
  sort?: SortOptionTx;
  perPage?: number;
  page?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export class TransactionService {
  static async getTransactionsPagination(
    params: GetTransactionParams,
    request?: Request,
  ) {
    const {
      predicateId,
      hash,
      id,
      status,
      type,
      to,
      orderBy = TransactionOrderBy.CREATED_AT,
      sort = SortOptionTx.DESC,
      perPage = 10,
      page = 1,
      dateFrom,
      dateTo,
    } = params;

    const where: FindManyOptions<Transaction>['where'] = {};

    if (predicateId?.length) {
      where.predicateId = In(predicateId);
    }

    if (hash?.length) {
      where.hash = In(hash);
    }

    if (id) {
      where.id = id;
    }

    if (status?.length) {
      where.status = In(status);
    }

    if (type) {
      where.type = type;
    }

    if (to?.length) {
      where.to = In(to);
    }

    if (dateFrom) {
      where.createdAt = {
        ...where.createdAt,
        ...MoreThanOrEqual(dateFrom),
      };
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = {
        ...where.createdAt,
        ...LessThanOrEqual(endOfDay),
      };
    }

    const [transactions, total] = await Transaction.findAndCount({
      where,
      order: {
        [orderBy]: sort,
      },
      take: perPage,
      skip: (page - 1) * perPage,
      relations: {
        predicate: {
          workspace: true,
        },
      },
    });

    const totalPages = Math.ceil(total / perPage);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data: transactions,
      total,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: hasPreviousPage ? page - 1 : null,
    };
  }

  static async getByHash(
    hash: string,
    status?: TransactionStatus[],
  ): Promise<Transaction> {
    const where: FindManyOptions<Transaction>['where'] = { hash };

    if (status?.length) {
      where.status = In(status);
    }

    const transaction = await Transaction.findOne({
      where,
      relations: {
        predicate: {
          workspace: true,
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  static async findByPredicateAndUser(
    predicateAddress: string,
    userId: string,
  ) {
    return Transaction.find({
      where: {
        predicate: {
          predicateAddress,
          workspace: {
            users: {
              id: userId,
            },
          },
        },
      },
      relations: {
        predicate: {
          workspace: {
            users: true,
          },
        },
      },
    });
  }

  static async create(data: Partial<Transaction>) {
    const transaction = Transaction.create(data);
    return Transaction.save(transaction);
  }

  static async update(id: string, data: Partial<Transaction>) {
    await Transaction.update(id, data);
    return Transaction.findOne({
      where: { id },
      relations: {
        predicate: {
          workspace: true,
        },
      },
    });
  }

  static async delete(id: string) {
    return Transaction.delete(id);
  }
}
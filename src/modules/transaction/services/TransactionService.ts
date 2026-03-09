import { TransactionStatus } from 'bakosafe';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Transaction } from '../entities/Transaction';

export interface GetTransactionParams {
  predicateId?: string[];
  status?: TransactionStatus[];
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
  orderBy?: string;
  sort?: 'ASC' | 'DESC';
}

export class TransactionService {
  constructor(private transactionRepository: Repository<Transaction>) {}

  async getTransactionsPagination(params: GetTransactionParams) {
    const {
      predicateId,
      status,
      type,
      dateFrom,
      dateTo,
      page = 1,
      perPage = 10,
      orderBy = 'createdAt',
      sort = 'DESC',
    } = params;

    // Validate date range if provided
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error('Formato de data inválido');
      }
      
      if (fromDate > toDate) {
        throw new Error('Data inicial deve ser anterior à data final');
      }
      
      // Validate maximum 2 years interval
      const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
      if (toDate.getTime() - fromDate.getTime() > twoYearsInMs) {
        throw new Error('Intervalo máximo de 2 anos permitido');
      }
    }
    
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      throw new Error('Ambos os campos de data são obrigatórios');
    }

    let queryBuilder: SelectQueryBuilder<Transaction> = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.predicate', 'predicate');

    // Apply filters
    if (predicateId && predicateId.length > 0) {
      queryBuilder = queryBuilder.andWhere('transaction.predicateId IN (:...predicateId)', {
        predicateId,
      });
    }

    if (type) {
      queryBuilder = queryBuilder.andWhere('transaction.type = :type', { type });
    }

    // Special logic for date filters with pending transactions
    if (dateFrom && dateTo) {
      const fromDateUTC = new Date(dateFrom + 'T00:00:00.000Z');
      const toDateUTC = new Date(dateTo + 'T23:59:59.999Z');
      
      queryBuilder = queryBuilder.andWhere(
        '(transaction.createdAt BETWEEN :dateFrom AND :dateTo OR transaction.status = :pendingStatus)',
        {
          dateFrom: fromDateUTC,
          dateTo: toDateUTC,
          pendingStatus: TransactionStatus.AWAIT_REQUIREMENTS,
        },
      );
    }

    if (status && status.length > 0) {
      queryBuilder = queryBuilder.andWhere('transaction.status IN (:...status)', {
        status,
      });
    }

    // Apply ordering
    queryBuilder = queryBuilder.orderBy(`transaction.${orderBy}`, sort);

    // Apply pagination
    const offset = (page - 1) * perPage;
    queryBuilder = queryBuilder.skip(offset).take(perPage);

    const [data, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / perPage);
    const nextPage = page < totalPages ? page + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;

    return {
      data,
      total,
      currentPage: page,
      totalPages,
      nextPage,
      prevPage,
      perPage,
    };
  }

  async getByHash(hash: string, status?: TransactionStatus[]) {
    let queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.hash = :hash', { hash });

    if (status && status.length > 0) {
      queryBuilder = queryBuilder.andWhere('transaction.status IN (:...status)', {
        status,
      });
    }

    return queryBuilder.getOne();
  }
}
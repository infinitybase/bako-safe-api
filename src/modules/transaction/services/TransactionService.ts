import { TransactionStatus, TransactionType } from 'bakosafe';
import { Repository } from 'typeorm';

import { database } from '../../../database';
import { Transaction } from '../entities/Transaction';
import { GetTransactionParams } from '../types';

export class TransactionService {
  private static repository: Repository<Transaction> = database.getRepository(Transaction);

  static async getTransactionsPagination(params: GetTransactionParams & {
    dateFrom?: string;
    dateTo?: string;
  }) {
    const {
      page = 1,
      perPage = 10,
      predicateId,
      status,
      type,
      orderBy = 'createdAt',
      sort = 'DESC',
      dateFrom,
      dateTo,
    } = params;

    // Validate date parameters
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      throw new Error('Ambos os campos de data são obrigatórios');
    }

    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error('Formato de data inválido');
      }

      if (fromDate >= toDate) {
        throw new Error('Data inicial deve ser anterior à data final');
      }

      const maxInterval = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
      if (toDate.getTime() - fromDate.getTime() > maxInterval) {
        throw new Error('Intervalo máximo permitido é de 2 anos');
      }
    }

    const queryBuilder = this.repository.createQueryBuilder('transaction');

    // Base filters
    if (predicateId && predicateId.length > 0) {
      queryBuilder.andWhere('transaction.predicateId IN (:...predicateId)', { predicateId });
    }

    if (status && status.length > 0) {
      queryBuilder.andWhere('transaction.status IN (:...status)', { status });
    }

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    // Date filter logic with special handling for pending transactions
    if (dateFrom && dateTo) {
      const fromDateUTC = new Date(dateFrom + 'T00:00:00.000Z');
      const toDateUTC = new Date(dateTo + 'T23:59:59.999Z');

      queryBuilder.andWhere(
        '(transaction.createdAt BETWEEN :dateFrom AND :dateTo OR transaction.status = :pendingStatus)',
        {
          dateFrom: fromDateUTC,
          dateTo: toDateUTC,
          pendingStatus: TransactionStatus.AWAIT_REQUIREMENTS,
        }
      );
    }

    // Ordering
    queryBuilder.orderBy(`transaction.${orderBy}`, sort as 'ASC' | 'DESC');

    // Pagination
    const offset = (page - 1) * perPage;
    queryBuilder.skip(offset).take(perPage);

    const [data, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / perPage);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      total,
      currentPage: page,
      totalPages,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    };
  }

  static async getByHash(hash: string, status?: TransactionStatus[]) {
    const queryBuilder = this.repository.createQueryBuilder('transaction');
    
    queryBuilder.where('transaction.hash = :hash', { hash });
    
    if (status && status.length > 0) {
      queryBuilder.andWhere('transaction.status IN (:...status)', { status });
    }
    
    return queryBuilder.getOne();
  }
}
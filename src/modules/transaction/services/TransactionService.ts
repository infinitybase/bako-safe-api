import { TransactionStatus, TransactionType } from 'bakosafe';
import { FindManyOptions, Repository, SelectQueryBuilder } from 'typeorm';

import { AppDataSource } from '@/database/data-source';
import { Predicate, Transaction, Workspace } from '@/models';
import { TransactionOrderBy } from '@/modules/transaction/types';
import { SortOptionTx } from '@/types';
import { Pagination } from '@/utils/Pagination';

interface IListFilter {
  predicateId?: string[];
  status?: TransactionStatus[];
  to?: string[];
  hash?: string[];
  id?: string;
  type?: TransactionType;
  orderBy?: TransactionOrderBy;
  sort?: SortOptionTx;
  dateFrom?: string;
  dateTo?: string;
}

interface IListParams extends IListFilter {
  page: number;
  perPage: number;
}

class TransactionService {
  private transactionRepository: Repository<Transaction>;
  private predicateRepository: Repository<Predicate>;
  private workspaceRepository: Repository<Workspace>;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.predicateRepository = AppDataSource.getRepository(Predicate);
    this.workspaceRepository = AppDataSource.getRepository(Workspace);
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Transaction>,
    filter: IListFilter,
  ): SelectQueryBuilder<Transaction> {
    if (filter.predicateId && filter.predicateId.length > 0) {
      queryBuilder.andWhere('transaction.predicateId IN (:...predicateIds)', {
        predicateIds: filter.predicateId,
      });
    }

    if (filter.status && filter.status.length > 0) {
      queryBuilder.andWhere('transaction.status IN (:...statuses)', {
        statuses: filter.status,
      });
    }

    if (filter.to && filter.to.length > 0) {
      queryBuilder.andWhere('transaction.to IN (:...tos)', {
        tos: filter.to,
      });
    }

    if (filter.hash && filter.hash.length > 0) {
      queryBuilder.andWhere('transaction.hash IN (:...hashes)', {
        hashes: filter.hash,
      });
    }

    if (filter.id) {
      queryBuilder.andWhere('transaction.id = :id', { id: filter.id });
    }

    if (filter.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: filter.type });
    }

    if (filter.dateFrom) {
      queryBuilder.andWhere('transaction.createdAt >= :dateFrom', {
        dateFrom: new Date(filter.dateFrom),
      });
    }

    if (filter.dateTo) {
      queryBuilder.andWhere('transaction.createdAt <= :dateTo', {
        dateTo: new Date(filter.dateTo),
      });
    }

    return queryBuilder;
  }

  async list(params: IListParams) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.predicate', 'predicate')
      .leftJoinAndSelect('predicate.workspace', 'workspace');

    this.applyFilters(queryBuilder, params);

    const orderBy = params.orderBy || TransactionOrderBy.CREATED_AT;
    const sort = params.sort || SortOptionTx.DESC;
    queryBuilder.orderBy(`transaction.${orderBy}`, sort);

    const [transactions, total] = await queryBuilder
      .skip((params.page - 1) * params.perPage)
      .take(params.perPage)
      .getManyAndCount();

    return Pagination.create({
      data: transactions,
      total,
      page: params.page,
      perPage: params.perPage,
    });
  }

  async findByHash(hash: string, status?: TransactionStatus[]) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.predicate', 'predicate')
      .leftJoinAndSelect('predicate.workspace', 'workspace')
      .where('transaction.hash = :hash', { hash });

    if (status && status.length > 0) {
      queryBuilder.andWhere('transaction.status IN (:...statuses)', {
        statuses: status,
      });
    }

    return queryBuilder.getOne();
  }

  async findById(id: string) {
    return this.transactionRepository.findOne({
      where: { id },
      relations: ['predicate', 'predicate.workspace'],
    });
  }

  async create(transactionData: Partial<Transaction>) {
    const transaction = this.transactionRepository.create(transactionData);
    return this.transactionRepository.save(transaction);
  }

  async update(id: string, transactionData: Partial<Transaction>) {
    await this.transactionRepository.update(id, transactionData);
    return this.findById(id);
  }

  async delete(id: string) {
    return this.transactionRepository.delete(id);
  }
}

export { TransactionService };
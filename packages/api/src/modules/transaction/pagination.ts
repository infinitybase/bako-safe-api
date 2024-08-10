import { SelectQueryBuilder } from 'typeorm';

export interface ITransactionPagination<T> {
  perPage: number;
  data: T[];
  offsetDb: number;
  offsetFuel: number;
}

export interface TransactionPaginationParams {
  perPage: string;
  offset: string;
}

export class TransactionPagination<T> {
  constructor(private _queryBuilder: SelectQueryBuilder<T>) {}

  static create<T>(queryBuilder: SelectQueryBuilder<T>) {
    return new TransactionPagination(queryBuilder);
  }

  async paginate(params: TransactionPaginationParams): Promise<T[]> {
    const offset = Number(params.offset || 0);
    const perPage = Number(params.perPage || 10);

    const data = await this._queryBuilder.skip(offset).take(perPage).getMany();

    return data;
  }
}

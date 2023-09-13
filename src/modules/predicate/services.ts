import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate } from '@models/index';

import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import { IAddPredicatePayload, IPredicateService } from './types';

export class PredicateService implements IPredicateService {
  private _ordination: IOrdination<Predicate>;
  private _pagination: PaginationParams;

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Predicate>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async add(payload: IAddPredicatePayload): Promise<Predicate> {
    try {
      const predicate = await Predicate.create(payload).save();

      return predicate;
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate creation',
        detail: e,
      });
    }
  }

  async findAll(): Promise<IPagination<Predicate> | Predicate[]> {
    try {
      const hasPagination = this._pagination?.page && this._pagination?.perPage;

      const queryBuilder = Predicate.createQueryBuilder('p').select();
      console.log(this._ordination);

      queryBuilder.orderBy(`p.${this._ordination.orderBy}`, this._ordination.sort);

      return hasPagination
        ? await Pagination.create(queryBuilder).paginate(this._pagination)
        : await queryBuilder.getMany();
    } catch (e) {
      console.log(e);
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findAll',
        detail: e,
      });
    }
  }

  async findById(id: number): Promise<Predicate> {
    try {
      const predicate = await Predicate.findOne({
        where: {
          id,
        },
      });

      return predicate;
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findById',
        detail: e,
      });
    }
  }

  async findByAdresses(addresses: string): Promise<Predicate> {
    try {
      const queryBuilder = Predicate.createQueryBuilder('p').select();

      addresses &&
        queryBuilder.where('LOWER(p.addresses) LIKE LOWER(:addresses)', {
          addresses: `%${addresses}%`,
        });
      return await queryBuilder.getOne();
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findByAdresses',
        detail: e,
      });
    }
  }
}

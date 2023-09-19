import { NotFound } from '@src/utils/error';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate } from '@models/index';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  ICreatePredicatePayload,
  IPredicateFilterParams,
  IPredicateService,
  IUpdatePredicatePayload,
} from './types';

export class PredicateService implements IPredicateService {
  private _ordination: IOrdination<Predicate>;
  private _pagination: PaginationParams;
  private _filter: IPredicateFilterParams;

  filter(filter: IPredicateFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Predicate>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(payload: ICreatePredicatePayload): Promise<Predicate> {
    return Predicate.create(payload)
      .save()
      .then(predicate => predicate)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate creation',
          detail: e,
        });
      });
  }

  async findById(id: string): Promise<Predicate> {
    return Predicate.findOne({ where: { id } })
      .then(predicate => {
        if (!predicate) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Predicate not found',
            detail: `Predicate with id ${id} not found`,
          });
        }

        return predicate;
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate findById',
          detail: e,
        });
      });
  }

  async list(): Promise<IPagination<Predicate> | Predicate[]> {
    const hasPagination = this._pagination.page && this._pagination.perPage;
    const queryBuilder = Predicate.createQueryBuilder('p').select();

    const handleInternalError = e => {
      if (e instanceof GeneralError) throw e;

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate list',
        detail: e,
      });
    };

    this._filter.address &&
      queryBuilder.where(
        'LOWER(p.predicatedAddress) LIKE LOWER(:predicatedAddress)',
        { predicateAddress: `%${this._filter.address}%` },
      );

    this._filter.provider &&
      queryBuilder.where('LOWER(p.provider) LIKE LOWER(:provider)', {
        provider: `%${this._filter.provider}%`,
      });

    this._filter.owner &&
      queryBuilder.where('LOWER(p.owner) LIKE LOWER(:owner)', {
        owner: `%${this._filter.owner}%`,
      });

    this._filter.signer &&
      queryBuilder.where(
        `:address = ANY(SELECT jsonb_array_elements_text(p.addresses::jsonb)::text)`,
        { address: this._filter.signer },
      );

    queryBuilder.orderBy(`p.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(handleInternalError)
      : queryBuilder
          .getMany()
          .then(predicates => {
            if (!predicates.length) {
              throw new NotFound({
                type: ErrorTypes.NotFound,
                title: 'Error on predicate list',
                detail: 'No predicate was found for the provided params',
              });
            }

            return predicates;
          })
          .catch(handleInternalError);
  }

  async update(id: string, payload: IUpdatePredicatePayload): Promise<Predicate> {
    return Predicate.update({ id }, payload)
      .then(() => this.findById(id))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate update',
          detail: e,
        });
      });
  }

  async delete(id: string): Promise<boolean> {
    return await Predicate.update({ id }, { deletedAt: new Date() })
      .then(() => true)
      .catch(() => {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with id ${id} not found`,
        });
      });
  }
}

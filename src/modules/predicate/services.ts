import { NotFound } from '@src/utils/error';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate } from '@models/index';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
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

  async findAll(): Promise<IPagination<Predicate> | Predicate[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;

    const queryBuilder = Predicate.createQueryBuilder('p').select();

    queryBuilder.orderBy(`p.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(e => {
            console.log(e);
            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on predicate findAll',
              detail: e,
            });
          })
      : queryBuilder
          .getMany()
          .then(predicates => predicates)
          .catch(e => {
            console.log(e);
            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on predicate findAll',
              detail: e,
            });
          });
  }

  async findById(id: string): Promise<Predicate> {
    return Predicate.findOne({
      where: { id },
    })
      .then(predicate => {
        if (!predicate) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Predicate not found',
            detail: `No predicate was found for the provided ID: ${id}.`,
          });
        }

        return predicate;
      })
      .catch(e => {
        if (e instanceof GeneralError) {
          throw e;
        }

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate findById',
          detail: e,
        });
      });
  }

  async findByPredicateAddress(predicateAddress: string): Promise<Predicate> {
    return Predicate.findOne({
      where: { predicateAddress },
    })
      .then(predicate => {
        if (!predicate) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Predicates not found',
            detail: `No predicate was found for the provided predicate's address.`,
          });
        }

        return predicate;
      })
      .catch(e => {
        if (e instanceof GeneralError) {
          throw e;
        }

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate findByPredicateAddress',
          detail: e,
        });
      });
  }

  async findByAdresses(
    address: string,
  ): Promise<IPagination<Predicate> | Predicate[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Predicate.createQueryBuilder('p').select();

    if (address) {
      queryBuilder
        .where(
          `:address = ANY(SELECT jsonb_array_elements_text(p.addresses::jsonb)::text)`,
          { address: address },
        )
        .orderBy(`p.${this._ordination.orderBy}`, this._ordination.sort);
    }

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(paginationResult => paginationResult)
          .catch(e => {
            console.log(e);
            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on predicate findByAddresses',
              detail: e,
            });
          })
      : queryBuilder
          .getMany()
          .then(predicates => {
            if (!predicates.length) {
              throw new NotFound({
                type: ErrorTypes.NotFound,
                title: 'Predicates not found',
                detail: `No predicates were found for the provided address.`,
              });
            }

            return predicates;
          })
          .catch(e => {
            if (e instanceof GeneralError) {
              throw e;
            }

            throw new Internal({
              type: ErrorTypes.Internal,
              title: 'Error on predicate findByAdresses',
              detail: e,
            });
          });
  }
}

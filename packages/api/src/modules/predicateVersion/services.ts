import { PredicateVersion } from '@src/models';
import { IPredicateVersionFilterParams, IPredicateVersionService } from './types';
import Internal from '@src/utils/error/Internal';
import { ErrorTypes, NotFound } from '@src/utils/error';
import GeneralError from '@src/utils/error/GeneralError';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';
import { Brackets } from 'typeorm';

export class PredicateVersionService implements IPredicateVersionService {
  private _ordination: IOrdination<PredicateVersion> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };
  private _pagination: PaginationParams;
  private _filter: IPredicateVersionFilterParams;

  filter(filter: IPredicateVersionFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<PredicateVersion>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async list(): Promise<IPagination<PredicateVersion> | PredicateVersion[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const hasOrdination = this._ordination?.orderBy && this._ordination?.sort;

    const qb = PredicateVersion.createQueryBuilder('pv').select();

    const handleInternalError = e => {
      console.log('[LIST]: ', e);
      if (e instanceof GeneralError) throw e;

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate version list',
        detail: e,
      });
    };

    this._filter.active &&
      qb.andWhere('pv.active = :active', { active: this._filter.active });

    this._filter.rootAddress &&
      qb.andWhere('pv.rootAddress = :rootAddress', {
        rootAddress: this._filter.rootAddress,
      });

    this._filter.q &&
      qb.andWhere(
        new Brackets(qb =>
          qb
            .where('LOWER(pv.name) LIKE LOWER(:name)', {
              name: `%${this._filter.q}%`,
            })
            .orWhere('LOWER(pv.description) LIKE LOWER(:description)', {
              description: `%${this._filter.q}%`,
            }),
        ),
      );

    hasOrdination &&
      qb.orderBy(`pv.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(qb)
          .paginate(this._pagination)
          .then(result => result)
          .catch(handleInternalError)
      : qb
          .getMany()
          .then(predicateVersions => predicateVersions ?? [])
          .catch(handleInternalError);
  }

  async findByRootAddress(rootAddress: string): Promise<PredicateVersion> {
    return await PredicateVersion.findOne({ where: { rootAddress } })
      .then(predicateVersion => {
        if (!predicateVersion) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Predicate version not found',
            detail: `Predicate version with root address ${rootAddress} was not found`,
          });
        }

        return predicateVersion;
      })
      .catch(e => {
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate version findByRootAddress',
          detail: e,
        });
      });
  }

  async findCurrentVersion(): Promise<PredicateVersion> {
    return await PredicateVersion.findOne({
      order: {
        createdAt: 'DESC',
      },
    })
      .then(predicateVersion => {
        if (!predicateVersion) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Predicate version not found',
            detail: `No predicate version was found.`,
          });
        }

        return predicateVersion;
      })
      .catch(e => {
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate version findCurrentVersion',
          detail: e,
        });
      });
  }
}

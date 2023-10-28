import { Brackets } from 'typeorm';

import { NotFound } from '@src/utils/error';
import {
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error/Unauthorized';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate } from '@models/index';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  IPredicateFilterParams,
  IPredicatePayload,
  IPredicateService,
} from './types';

export class PredicateService implements IPredicateService {
  private _ordination: IOrdination<Predicate> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };
  private _pagination: PaginationParams;
  private _filter: IPredicateFilterParams;
  private predicateFieldsSelection = [
    'p.id',
    'p.createdAt',
    'p.deletedAt',
    'p.updatedAt',
    'p.name',
    'p.predicateAddress',
    'p.description',
    'p.minSigners',
    'p.owner',
    'p.provider',
    'p.chainId',
  ];

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

  async create(payload: IPredicatePayload): Promise<Predicate> {
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

  async findById(id: string, signer?: string): Promise<Predicate> {
    return Predicate.createQueryBuilder('p')
      .where({ id })
      .leftJoinAndSelect('p.members', 'members')
      .leftJoinAndSelect('p.owner', 'owner')
      .select([
        ...this.predicateFieldsSelection,
        'p.configurable',
        'members.avatar',
        'members.address',
        'owner.id',
        'owner.address',
      ])
      .getOne()
      .then(predicate => {
        const isNotMember = !predicate.members.map(m => m.address).includes(signer);

        if (isNotMember) {
          throw new Unauthorized({
            type: ErrorTypes.Unauthorized,
            title: UnauthorizedErrorTitles.INVALID_PERMISSION,
            detail: `You are not authorized to access requested predicate.`,
          });
        }

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
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate findById',
          detail: e,
        });
      });
  }

  async list(): Promise<IPagination<Predicate> | Predicate[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Predicate.createQueryBuilder('p')
      .select(this.predicateFieldsSelection)
      .innerJoin('p.members', 'members')
      .innerJoin('p.owner', 'owner')
      .addSelect([
        'members.id',
        'members.address',
        'members.avatar',
        'owner.id',
        'owner.address',
      ]);

    const handleInternalError = e => {
      if (e instanceof GeneralError) throw e;

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate list',
        detail: e,
      });
    };

    this._filter.address &&
      queryBuilder.andWhere('p.predicateAddress =:predicateAddress', {
        predicateAddress: this._filter.address,
      });

    this._filter.provider &&
      queryBuilder.andWhere('LOWER(p.provider) = LOWER(:provider)', {
        provider: `${this._filter.provider}`,
      });

    this._filter.owner &&
      queryBuilder.andWhere('LOWER(p.owner) = LOWER(:owner)', {
        owner: `${this._filter.owner}`,
      });

    this._filter.signer &&
      queryBuilder.andWhere(qb => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('predicate_members', 'pm')
          .where('pm.predicate_id = p.id')
          .andWhere(
            '(pm.user_id = (SELECT u.id FROM users u WHERE u.address = :signer))',
            { signer: this._filter.signer },
          )
          .getQuery();

        return `EXISTS ${subQuery}`;
      });

    this._filter.q &&
      queryBuilder.andWhere(
        new Brackets(qb =>
          qb
            .where('LOWER(p.name) LIKE LOWER(:name)', {
              name: `%${this._filter.q}%`,
            })
            .orWhere('LOWER(p.description) LIKE LOWER(:description)', {
              description: `%${this._filter.q}%`,
            }),
        ),
      );

    queryBuilder.orderBy(`p.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(result => {
            return {
              ...result,
              data: result.data.map(predicate => ({
                ...predicate,
                members: predicate.members.map(({ id, ...rest }) => rest),
              })),
            } as IPagination<Predicate>;
          })
          .catch(handleInternalError)
      : queryBuilder
          .getMany()
          .then(predicates => {
            const result = predicates.map(predicate => ({
              ...predicate,
              members: predicate.members.map(({ id, ...rest }) => rest),
            })) as Predicate[];

            return result ?? [];
          })
          .catch(handleInternalError);
  }

  async update(id: string, payload: IPredicatePayload): Promise<Predicate> {
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

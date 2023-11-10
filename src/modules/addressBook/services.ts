import { Brackets } from 'typeorm';

import AddressBook from '@src/models/AddressBook';
import { NotFound } from '@src/utils/error';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { IOrdination, setOrdination } from '@utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@utils/pagination';

import {
  IAddressBookService,
  ICreateAddressBookPayload,
  IFilterAddressBookParams,
  IUpdateAddressBookPayload,
} from './types';

export class AddressBookService implements IAddressBookService {
  private _ordination: IOrdination<AddressBook> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };
  private _pagination: PaginationParams;
  private _filter: IFilterAddressBookParams;
  filter(filter: IFilterAddressBookParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<AddressBook>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(payload: ICreateAddressBookPayload): Promise<AddressBook> {
    return await AddressBook.create(payload)
      .save()
      .then(contact => contact)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on contact creation',
          detail: e,
        });
      });
  }

  async list(): Promise<IPagination<AddressBook> | AddressBook[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = AddressBook.createQueryBuilder('ab')
      .select(['ab.id', 'ab.nickname'])
      .innerJoin('ab.user', 'user')
      .innerJoin('ab.createdBy', 'createdBy')
      .addSelect([
        'user.id',
        'user.address',
        'user.avatar',
        'createdBy.id',
        'createdBy.address',
      ]);

    const handleInternalError = e => {
      if (e instanceof GeneralError) throw e;

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate list',
        detail: e,
      });
    };

    this._filter.createdBy &&
      queryBuilder.andWhere('ab.created_by = :createdBy', {
        createdBy: `${this._filter.createdBy}`,
      });

    this._filter.contactAddress &&
      queryBuilder.andWhere('user.address = :contactAddress', {
        contactAddress: `${this._filter.contactAddress}`,
      });

    this._filter.nickname &&
      queryBuilder.andWhere('ab.nickname = :nickname', {
        nickname: `${this._filter.nickname}`,
      });

    this._filter.q &&
      queryBuilder.andWhere(
        new Brackets(qb =>
          qb
            .where('LOWER(ab.nickname) LIKE LOWER(:nickname)', {
              nickname: `%${this._filter.q}%`,
            })
            .orWhere('LOWER(user.address) LIKE LOWER(:address)', {
              address: `%${this._filter.q}%`,
            }),
        ),
      );

    queryBuilder.orderBy(`ab.${this._ordination.orderBy}`, this._ordination.sort);

    return hasPagination
      ? Pagination.create(queryBuilder)
          .paginate(this._pagination)
          .then(result => result)
          .catch(handleInternalError)
      : queryBuilder
          .getMany()
          .then(predicates => predicates)
          .catch(handleInternalError);
  }

  async findById(id: string): Promise<AddressBook> {
    return AddressBook.findOne({
      where: { id },
    })
      .then(contact => {
        if (!contact) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Contact not found',
            detail: `No contact was found for the provided ID: ${id}.`,
          });
        }

        return contact;
      })
      .catch(e => {
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction findById',
          detail: e,
        });
      });
  }

  async update(
    id: string,
    payload: IUpdateAddressBookPayload,
  ): Promise<AddressBook> {
    return AddressBook.update({ id }, payload)
      .then(() => this.findById(id))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on transaction update',
          detail: e,
        });
      });
  }

  async delete(id: string) {
    return await AddressBook.update({ id }, { deletedAt: new Date() })
      .then(() => true)
      .catch(() => {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Contact not found',
          detail: `Contact with id ${id} was not found`,
        });
      });
  }
}

import Role from '@src/models/Role';
import { ErrorTypes, NotFound } from '@src/utils/error';
import Internal from '@src/utils/error/Internal';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { IRolePayload, IFilterParams, IRoleService } from './types';

export class RoleService implements IRoleService {
  private _pagination: PaginationParams;
  private _filter: IFilterParams;
  private _ordination: IOrdination<Role>;

  filter(filter: IFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination: IOrdination<Role>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(payload: IRolePayload): Promise<Role> {
    return await Role.create(payload)
      .save()
      .then(data => data)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Create,
          title: 'Error on role create',
          detail: e,
        });
      });
  }

  async find(): Promise<IPagination<Role> | Role[]> {
    try {
      const hasPaginationParams = this._pagination.page && this._pagination.perPage;
      const queryBuilder = Role.createQueryBuilder('r').select();

      this._filter.role &&
        queryBuilder.andWhere('LOWER(r.name) LIKE LOWER(:q)', {
          q: `%${this._filter.role}%`,
        });

      this._filter.active &&
        queryBuilder.andWhere('r.active = :active', {
          active: this._filter.active,
        });

      queryBuilder.orderBy(`r.${this._ordination.orderBy}`, this._ordination.sort);

      return hasPaginationParams
        ? await Pagination.create(queryBuilder).paginate(this._pagination)
        : await queryBuilder.getMany();
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on roles find',
        detail: error,
      });
    }
  }

  async findOne(id: string): Promise<Role> {
    const role = await Role.findOne({ where: { id } });

    if (!role) {
      throw new NotFound({
        type: ErrorTypes.NotFound,
        title: 'Role not found',
        detail: `Role with id ${id} not found`,
      });
    }

    return role;
  }

  async update(id: string, payload: IRolePayload): Promise<Role> {
    return await Role.update({ id }, { ...payload })
      .then(async () => await this.findOne(id))
      .catch(() => {
        throw new Internal({
          type: ErrorTypes.Update,
          title: 'Role not updated',
          detail: `Role ${id} has not been changed`,
        });
      });
  }

  async delete(id: string): Promise<boolean> {
    return await Role.update({ id }, { deletedAt: new Date() })
      .then(() => true)
      .catch(() => {
        throw new Internal({
          type: ErrorTypes.Delete,
          title: 'Role not deleted',
          detail: `Role ${id} has not been deleted`,
        });
      });
  }
}

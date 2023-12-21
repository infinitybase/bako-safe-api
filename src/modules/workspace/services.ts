import { Workspace } from '@src/models/Workspace';
import { ErrorTypes } from '@src/utils/error';
import GeneralError from '@src/utils/error/GeneralError';
import Internal from '@src/utils/error/Internal';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { PaginationParams, IPagination, Pagination } from '@src/utils/pagination';

import { IFilterParams, IWorkspacePayload, IWorkspaceService } from './types';

export class ServiceWorkspace implements IWorkspaceService {
  private _ordination: IOrdination<Workspace> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };
  private _pagination: PaginationParams;
  private _filter: IFilterParams;

  filter(filter: IFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Workspace>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async list(): Promise<IPagination<Workspace> | Workspace[]> {
    try {
      const hasPagination = this._pagination?.page && this._pagination?.perPage;
      const queryBuilder = Workspace.createQueryBuilder('w')
        .select()
        .orderBy(`w.${this._ordination.orderBy}`, this._ordination.sort)
        .leftJoinAndSelect('w.owner', 'owner')
        .leftJoinAndSelect('w.members', 'users');

      this._filter.q &&
        queryBuilder.where('LOWER(w.name) LIKE LOWER(:name)', {
          name: `%${this._filter.q}%`,
        });
      this._filter.single &&
        queryBuilder.andWhere('single = :single', { single: this._filter.single });
      this._filter.owner &&
        queryBuilder.andWhere('owner.id = :owner', { owner: this._filter.owner });
      this._filter.user &&
        queryBuilder.andWhere('users.id = :user', { user: this._filter.user });

      return hasPagination
        ? Pagination.create(queryBuilder).paginate(this._pagination)
        : queryBuilder.getMany();
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on workspace list',
        detail: error,
      });
    }
  }

  async create(payload: Partial<Workspace>): Promise<Workspace> {
    return await Workspace.create(payload)
      .save()
      .then(data => data)
      .catch(error => {
        if (error instanceof GeneralError) throw error;

        throw new Internal({
          type: ErrorTypes.Create,
          title: 'Error on workspace create',
          detail: error,
        });
      });
  }
  findById: (id: string) => Promise<Workspace>;
}

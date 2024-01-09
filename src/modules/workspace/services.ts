import { Brackets } from 'typeorm';

import { Workspace } from '@src/models/Workspace';
import { ErrorTypes } from '@src/utils/error';
import GeneralError from '@src/utils/error/GeneralError';
import Internal from '@src/utils/error/Internal';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { PaginationParams, IPagination, Pagination } from '@src/utils/pagination';

import { IFilterParams, IWorkspacePayload, IWorkspaceService } from './types';

export class WorkspaceService implements IWorkspaceService {
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
      const hasPagination = !!this._pagination;
      const hasOrdination = !!this._ordination;
      const queryBuilder = Workspace.createQueryBuilder('w')
        .select()
        .leftJoinAndSelect('w.owner', 'owner')
        .leftJoinAndSelect('w.members', 'users');

      this._filter.q &&
        queryBuilder.where('LOWER(w.name) LIKE LOWER(:name)', {
          name: `%${this._filter.q}%`,
        });

      this._filter.single &&
        queryBuilder.andWhere('single = :single', { single: this._filter.single });

      this._filter.owner &&
        queryBuilder.andWhere(
          `${
            this._filter.owner.length <= 36 ? 'owner.id' : 'owner.address'
          } = :owner`,
          {
            owner: this._filter.owner,
          },
        );

      this._filter.user &&
        queryBuilder.andWhere(
          `${
            this._filter.user.length <= 36 ? 'users.id' : 'users.address'
          } = :user`,
          {
            user: this._filter.user,
          },
        );

      this._filter.id &&
        queryBuilder.andWhere('w.id = :id', {
          id: this._filter.id,
        });

      hasOrdination &&
        queryBuilder.orderBy(
          `w.${this._ordination.orderBy}`,
          this._ordination.sort,
        );

      return hasPagination
        ? await Pagination.create(queryBuilder).paginate(this._pagination)
        : await queryBuilder.getMany();
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

  async update(payload: Partial<Workspace>): Promise<boolean> {
    const w = Object.assign(await Workspace.findOne({ id: payload.id }), payload);

    return w
      .save()
      .then(() => {
        return true;
      })
      .catch(error => {
        if (error instanceof GeneralError) throw error;

        throw new Internal({
          type: ErrorTypes.Update,
          title: 'Error on workspace update',
          detail: error,
        });
      });
  }

  findById: (id: string) => Promise<Workspace>;

  /**
   * Formatar os dados para usuário nao logado, removendo as infos delicadas
   *
   * @params w: Workspace[]
   *
   * @return o workspace resumido, apenas com nome, avatar e endereco do owner e membros
   *
   */
  static formatToUnloggedUser(w: Workspace[]) {
    return w.map(workspace => {
      return {
        id: workspace.id,
        name: workspace.name,
        avatar: workspace.avatar,
        owner: {
          name: workspace.owner.name,
          avatar: workspace.owner.avatar,
          address: workspace.owner.address,
        },
        members: workspace.members.map(member => {
          return {
            name: member.name,
            avatar: member.avatar,
            address: member.address,
          };
        }),
      };
    });
  }
}
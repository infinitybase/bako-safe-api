import { defaultConfig } from 'bakosafe';

import { TypeUser, User, PermissionAccess } from '@src/models';
import {
  IPermissions,
  PermissionRoles,
  Workspace,
  defaultPermissions,
} from '@src/models/Workspace';
import { ErrorTypes } from '@src/utils/error';
import GeneralError from '@src/utils/error/GeneralError';
import Internal from '@src/utils/error/Internal';
import { IOrdination, setOrdination } from '@src/utils/ordination';
import { PaginationParams, IPagination, Pagination } from '@src/utils/pagination';

import { IconUtils } from '@utils/icons';

import { UserService } from '../user/service';
import { IFilterParams, IWorkspaceService } from './types';

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
      const enableSingleFilter = this._filter.single !== undefined;
      const queryBuilder = Workspace.createQueryBuilder('w')
        .leftJoin('w.owner', 'owner')
        .leftJoin('w.members', 'users')
        .leftJoin('w.predicates', 'predicates')
        .select([
          'w', // Todos os campos de Workspace
          'owner', // Todos os campos de User (relação owner)
          'users', // Todos os campos de User (relação members)
          'predicates.id', // Seleção específica: apenas o campo 'id' de Predicate com alias
        ]);

      enableSingleFilter &&
        queryBuilder.andWhere('single = :single', {
          single: this._filter.single,
        });

      this._filter.q &&
        queryBuilder.where('LOWER(w.name) LIKE LOWER(:name)', {
          name: `%${this._filter.q}%`,
        });

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
        queryBuilder.andWhere(qb => {
          const subQuery = qb
            .subQuery()
            .select('*')
            .from('workspace_users', 'wu')
            .where('wu.workspace_id = w.id')
            .andWhere(
              '(wu.user_id = (SELECT u.id FROM users u WHERE u.id = :user))',
              { user: this._filter.user },
            )
            .getQuery();

          return `EXISTS ${subQuery}`;
        });

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

  async includeMembers(members: string[], owner: User, workspace?: string) {
    const _members: User[] = [];

    const _permissions: IPermissions = {};
    for await (const member of [...members, owner.id]) {
      const m =
        member.length <= 36
          ? await new UserService().findOne(member).then(data => data)
          : await new UserService()
              .findByAddress(member)
              .then(async (data: User) => {
                if (!data) {
                  return await new UserService().create({
                    address: member,
                    name: member,
                    provider: defaultConfig['PROVIDER'],
                    avatar: IconUtils.user(),
                    type: TypeUser.FUEL,
                  });
                }
                return data;
              });
      _members.push(m);
    }

    _members.map(m => {
      _permissions[m.id] =
        m.id === owner.id
          ? defaultPermissions[PermissionRoles.OWNER]
          : defaultPermissions[PermissionRoles.VIEWER];
    });
    const hasOwner =
      workspace &&
      (await new WorkspaceService()
        .filter({ id: workspace })
        .list()
        .then(data => {
          const { owner, permissions } = data[0];
          _members.map(member => {
            _permissions[member.id] = permissions[member.id];
          });
          return _members.find(member => member.id === owner.id);
        }));

    if (workspace && !hasOwner) {
      throw new Internal({
        type: ErrorTypes.NotFound,
        title: 'Owner not found',
        detail: `Owner cannot be removed from workspace`,
      });
    }

    return { _members, _permissions };
  }

  findById: (id: string) => Promise<Workspace>;

  /**
   * Formatar o capo de permissões do workspace, inserindo o assinante
   * caso o usuário ainda nao esteja na lista de membros, um novo field é criado, e o id do predicado adicionado
   * caso o usuário já esteja na lista de membros, o id do predicado é adicionado
   *
   * @params signers: string[] - lista de endereços dos signatários
   * @params predicate: string - id do predicado
   * @params worksapce: string - id do workspace
   *
   * @return Workspace
   *
   */
  async includeSigner(
    signers: string[],
    predicate: string,
    worksapce: string,
  ): Promise<void> {
    return await Workspace.findOne({ id: worksapce })
      .then(async workspace => {
        const p = workspace.permissions;
        signers.map(s => {
          if (p[s]) {
            p[s][PermissionRoles.SIGNER] = [
              ...p[s][PermissionRoles.SIGNER].filter(
                i => i != PermissionAccess.ALL && i !== PermissionAccess.NONE,
              ),
              predicate,
            ];
          } else {
            p[s] = {
              ...defaultPermissions[PermissionRoles.SIGNER],
              [PermissionRoles.SIGNER]: [predicate],
            };
          }
          return;
        });
        workspace.permissions = p;
        await workspace.save();
        return;
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
        single: workspace.single,
        description: workspace.description,
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
        predicates: workspace.predicates.length,
        permissions: workspace.permissions,
      };
    });
  }
}

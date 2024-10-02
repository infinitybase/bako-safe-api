import { Vault } from 'bakosafe';
import { Brackets } from 'typeorm';

import { NotFound } from '@src/utils/error';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate, TypeUser, User, Workspace } from '@models/index';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  IPredicateFilterParams,
  IPredicatePayload,
  IPredicateService,
} from './types';
import { IPredicateOrdination, setOrdination } from './ordination';
import { Network, Provider, ZeroBytes32 } from 'fuels';
import { UserService } from '../user/service';
import { IconUtils } from '@src/utils/icons';
import { PredicateVersionService } from '../predicateVersion/services';

export class PredicateService implements IPredicateService {
  private _ordination: IPredicateOrdination = {
    orderBy: 'updatedAt',
    sort: 'DESC',
    orderByRoot: 'false',
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
    'p.owner',
    'p.configurable',
    'p.root',
  ];

  filter(filter: IPredicateFilterParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IPredicateOrdination) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(
    payload: IPredicatePayload,
    network: Network,
    owner: User,
    workspace: Workspace,
  ): Promise<Predicate> {
    try {
      const members = [];
      const userService = new UserService();
      //const workspaceService = new WorkspaceService();
      const versionService = new PredicateVersionService();

      // create a pending users
      const { SIGNERS, SIGNATURES_COUNT } = JSON.parse(payload.configurable);
      const validUsers = SIGNERS.filter(address => address !== ZeroBytes32);

      for await (const member of validUsers) {
        let user = await userService.findByAddress(member);

        if (!user) {
          user = await userService.create({
            address: member,
            avatar: IconUtils.user(),
            type: TypeUser.FUEL,
            name: member,
            provider: network.url,
          });
        }

        members.push(user);
      }

      // create a predicate
      const predicate = await Predicate.create({
        ...payload,
        members,
        owner,
        version: payload.version ?? (await versionService.findCurrentVersion()),
        workspace,
      }).save();

      return await this.findById(predicate.id);
    } catch (e) {
      console.log(e);
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate creation',
        detail: e,
      });
    }
  }

  async findById(id: string): Promise<Predicate> {
    try {
      return await Predicate.createQueryBuilder('p')
        .where({ id })
        .leftJoinAndSelect('p.members', 'members')
        .leftJoinAndSelect('p.owner', 'owner')
        .leftJoin('p.version', 'version')
        .leftJoin('p.workspace', 'workspace')
        .leftJoin('workspace.addressBook', 'addressBook')
        .leftJoin('addressBook.user', 'adb_workspace')
        .select([
          ...this.predicateFieldsSelection,
          'p.configurable',
          'members.id',
          'members.avatar',
          'members.address',
          'owner.id',
          'owner.address',
          'version.id',
          'version.abi',
          'version.bytes',
          'version.code',
          'workspace.id',
          'workspace.name',
          'addressBook.nickname',
          'addressBook.id',
          'addressBook.user_id',
          'adb_workspace.id',
        ])
        .getOne();
    } catch (e) {
      if (e instanceof GeneralError) {
        throw e;
      }

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findById',
        detail: e,
      });
    }
  }

  async list(): Promise<IPagination<Predicate> | Predicate[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const hasOrdination = this._ordination?.orderBy && this._ordination?.sort;
    const queryBuilder = Predicate.createQueryBuilder('p')
      .select(this.predicateFieldsSelection)
      .innerJoin('p.members', 'members')
      .innerJoin('p.owner', 'owner')
      .innerJoin('p.workspace', 'workspace')
      .addSelect([
        'members.id',
        'members.address',
        'members.avatar',
        'owner.id',
        'owner.address',
        'owner.avatar',
        'workspace.id',
        'workspace.name',
        'workspace.single',
        'workspace.avatar',
      ]);

    try {
      // Aplicar filtros
      if (this._filter.ids) {
        queryBuilder.andWhere('p.id IN (:...ids)', {
          ids: this._filter.ids,
        });
      }

      if (this._filter.address) {
        queryBuilder.andWhere('p.predicateAddress = :predicateAddress', {
          predicateAddress: this._filter.address,
        });
      }

      if (this._filter.workspace && !this._filter.signer) {
        queryBuilder.andWhere(
          new Brackets(qb => {
            qb.orWhere('workspace.id IN (:...workspace)', {
              workspace: this._filter.workspace,
            });
          }),
        );
      }

      if (this._filter.name) {
        queryBuilder.andWhere('p.name = :name', {
          name: this._filter.name,
        });
      }

      if (this._filter.workspace || this._filter.signer) {
        queryBuilder.andWhere(
          new Brackets(qb => {
            if (this._filter.workspace) {
              qb.orWhere('workspace.id IN (:...workspace)', {
                workspace: this._filter.workspace,
              });
            }
            if (this._filter.signer) {
              qb.orWhere(subQb => {
                const subQuery = subQb
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
            }
          }),
        );
      }

      if (this._filter.q) {
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
      }

      if (this._ordination.orderByRoot === 'true') {
        queryBuilder.addOrderBy('p.root', this._ordination.sort);
      }

      if (hasOrdination) {
        // Aplicar ordenação
        queryBuilder.addOrderBy(
          `p.${this._ordination.orderBy}`,
          this._ordination.sort,
        );
      }

      // Paginação
      if (hasPagination) {
        return await Pagination.create(queryBuilder).paginate(this._pagination);
      } else {
        const predicates = await queryBuilder.getMany();
        return predicates ?? [];
      }
    } catch (e) {
      if (e instanceof GeneralError) {
        throw e;
      }

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate list',
        detail: e,
      });
    }
  }

  async update(id: string, payload?: IPredicatePayload): Promise<Predicate> {
    try {
      await Predicate.update(
        { id },
        {
          ...payload,
          updatedAt: new Date(),
        },
      );

      const updatedPredicate = await this.findById(id);

      if (!updatedPredicate) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with id ${id} not found after update`,
        });
      }

      return updatedPredicate;
    } catch (e) {
      if (e instanceof NotFound) throw e;
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate update',
        detail: e,
      });
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await Predicate.update({ id }, { deletedAt: new Date() });

      if (result.affected === 0) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with id ${id} not found`,
        });
      }

      return true;
    } catch (e) {
      if (e instanceof NotFound) {
        throw e;
      }

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate deletion',
        detail: e,
      });
    }
  }

  async instancePredicate(configurable: string, provider: string): Promise<Vault> {
    const conf = JSON.parse(configurable);
    const _provider = await Provider.create(provider);
    return new Vault(_provider, conf);
  }
}

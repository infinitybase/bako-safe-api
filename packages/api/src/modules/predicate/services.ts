import {
  AddressUtils as BakoAddressUtils,
  DEFAULT_PREDICATE_VERSION,
  Vault,
  Wallet as WalletType,
  getLatestPredicateVersion,
  legacyConnectorVersion,
} from 'bakosafe';
import { Brackets, MoreThan } from 'typeorm';

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
import { Network, ZeroBytes32 } from 'fuels';
import { UserService } from '../user/service';
import { IconUtils } from '@src/utils/icons';
import { FuelProvider } from '@src/utils';
import App from '@src/server/app';

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

      // create a pending users
      const { SIGNERS } = JSON.parse(payload.configurable);
      const validUsers = SIGNERS.filter(address => address !== ZeroBytes32);

      for await (const member of validUsers) {
        let user = await userService.findByAddress(member);
        let type = TypeUser.FUEL;
        if (BakoAddressUtils.isEvm(member)) {
          type = TypeUser.EVM;
        }

        if (!user) {
          user = await userService.create({
            address: member,
            avatar: IconUtils.user(),
            type,
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
        version: payload.version ?? DEFAULT_PREDICATE_VERSION,
        workspace,
      }).save();

      return await this.findById(predicate.id);
      // return predicate;
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
        .leftJoin('p.members', 'members')
        .leftJoin('p.owner', 'owner')
        .select([
          ...this.predicateFieldsSelection,
          'p.configurable',
          'members.id',
          'members.avatar',
          'members.address',
          'members.type',
          'owner.id',
          'owner.address',
          'owner.type',
        ])
        .getOne();
    } catch (e) {
      console.log(e);
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

  async togglePredicateStatus(
    userId: string,
    address: string,
    authorization: string,
  ) {
    const userService = new UserService();
    let user = await userService.findOne(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const inactives = user.settings?.inactivesPredicates || [];

    const updatedInactives = inactives.includes(address.toLowerCase())
      ? inactives.filter(addr => addr.toLowerCase() !== address.toLowerCase())
      : [...inactives, address.toLowerCase()];

    user.settings.inactivesPredicates = updatedInactives;
    user = await user.save();

    const session = await App.getInstance()._sessionCache.getSession(authorization);

    session.settings = user.settings;

    await App.getInstance()._sessionCache.addSession(authorization, session);

    return user.settings.inactivesPredicates;
  }

  async findByAddress(address: string): Promise<Predicate> {
    try {
      console.log(`Finding predicate by address: ${address}`);
      return await Predicate.findOne({
        where: { predicateAddress: address },
        relations: ['owner', 'members'],
        select: {
          owner: {
            id: true,
            address: true,
          },
          members: {
            id: true,
            address: true,
          },
        },
      });
    } catch (e) {
      console.log(e);
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findByAddress',
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

      if (
        typeof this._filter.hidden === 'boolean' &&
        this._filter.userId &&
        !this._filter.hidden
      ) {
        queryBuilder.andWhere(
          `
          p.predicateAddress NOT IN (
            SELECT jsonb_array_elements_text(u.settings->'inactivesPredicates')
            FROM users u
            WHERE u.id = :userId
          )
          `,
          { userId: this._filter.userId },
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

  // verifica se é evm ou svm
  // caso nao, apenas retorna um valor inválido
  // caso for, verifica (testa) todos os predicates compatíveis e o balance
  // cria vinculado ao usuário todos os predicates válidos (que possuem saldo)
  async checkOlderPredicateVersions(
    address: string, // user address
    provider: string,
  ): Promise<{ invisibleAccounts: string[], accounts: Vault[] }> {
    const _versions = await legacyConnectorVersion(address, provider);
    const versions = _versions.filter(v => !v.hasBalance).map(v => v.predicateAddress);

    const bakoLatestVersion = getLatestPredicateVersion(WalletType.FUEL).version;
    const result: Vault[] = [];
    // add the bako 1st version
    _versions.unshift({
      version: bakoLatestVersion,
      hasBalance: true,
      predicateAddress: 'fake-address',
      details: {
        origin: WalletType.FUEL,
        toolchain: {
          fuelsVersion: '0.101.1',
          forcVersion: '0.101.1',
          fuelCoreVersion: '0.101.1',
        },
        versionTime: 0,
        description: 'Bako latest version',
      },
      ethBalance: {
        assetId: 'fake-asset-id',
        amount: '0',
        symbol: 'fake-symbol',
      },
      balances: [],
    });


    for (const v of _versions) {
      const isFromConnector =
        v.details.origin === WalletType.EVM || v.details.origin === WalletType.SVM;

      const c = isFromConnector
        ? () => {
          return {
            SIGNER: address,
          };
        }
        : () => {
          // bako version
          return {
            SIGNERS: [address],
            SIGNATURES_COUNT: 1,
          };
        };

      const vault = await this.instancePredicate(
        JSON.stringify(c()),
        provider,
        v.version,
      );

      result.push(vault);
    }

    return {
      invisibleAccounts: versions,
      accounts: result,
    };
  }

  async instancePredicate(
    configurable: string,
    provider: string,
    version?: string,
  ): Promise<Vault> {
    const conf = JSON.parse(configurable);
    const _provider = await FuelProvider.create(
      provider.replace(/^https?:\/\/[^@]+@/, 'https://'),
    );

    return new Vault(_provider, conf, version);
  }

  async listDateMoreThan(d?: Date) {
    const queryBuilder = Predicate.createQueryBuilder('p').innerJoin(
      'p.owner',
      'owner',
    );

    if (d) {
      queryBuilder.where({
        createdAt: MoreThan(d),
      });
    }

    if (this._filter.select) {
      queryBuilder.select(this._filter.select);
    }

    return await Pagination.create(queryBuilder).paginate(this._pagination);
  }
}

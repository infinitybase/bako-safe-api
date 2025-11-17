import {
  AddressUtils as BakoAddressUtils,
  DEFAULT_PREDICATE_VERSION,
  getLatestPredicateVersion,
  legacyConnectorVersion,
  TransactionStatus,
  TypeUser,
  Vault,
  Wallet as WalletType,
} from 'bakosafe';
import { Brackets, MoreThan } from 'typeorm';

import { NotFound } from '@src/utils/error';
import { IPagination, Pagination, PaginationParams } from '@src/utils/pagination';

import { Predicate, User, Workspace } from '@models/index';

import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import App from '@src/server/app';
import {
  calculateBalanceUSD,
  calculateReservedCoins,
  FuelProvider,
  subCoins,
} from '@src/utils';
import { IconUtils } from '@src/utils/icons';
import { bn, Network, ZeroBytes32 } from 'fuels';
import { UserService } from '../user/service';
import { IPredicateOrdination, setOrdination } from './ordination';
import {
  AssetAllocation,
  IPredicateAllocation,
  IPredicateAllocationParams,
  IPredicateFilterParams,
  IPredicatePayload,
  IPredicateService,
} from './types';

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
    'p.version',
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

      if (this._filter.owner) {
        queryBuilder.andWhere('owner.id = :owner', {
          owner: this._filter.owner,
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

  async update(
    id: string,
    payload?: Partial<IPredicatePayload>,
  ): Promise<Predicate> {
    try {
      const currentPredicate = await this.findById(id);

      if (!currentPredicate) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with id ${id} not found after update`,
        });
      }

      const updatedPredicate = await Predicate.merge(currentPredicate, {
        name: payload?.name,
        description: payload?.description,
        updatedAt: new Date(),
      }).save();

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

  /**
   * Checks and instantiates older predicate versions associated with a user address.
   *
   * This function retrieves legacy predicate versions linked to a given `address` and `provider`.
   * It sorts and filters these versions based on whether they have a balance, instantiates
   * relevant versions as `Vault` objects, and identifies "invisible" accounts (those without balance).
   *
   * ### Behavior:
   * - Fetches legacy versions using `legacyConnectorVersion`.
   * - Filters versions that have a balance (`hasBalance`) and sorts them by `versionTime` (newest first).
   * - Identifies versions without balance and collects their `predicateAddress`.
   * - If no versions have a balance:
   *   - Gets the latest predicate version (`getLatestPredicateVersion`).
   *   - Creates a default predicate instance using `instancePredicate`.
   * - Otherwise:
   *   - Instantiates all predicates with balance.
   *   - Detects whether the origin is `EVM` or `SVM` to set the correct configuration.
   *
   * @async
   * @param {string} address - The user's wallet address.
   * @param {string} provider - The blockchain provider.
   *
   * @returns {Promise<{ invisibleAccounts: string[]; accounts: Vault[] }>}
   * An object containing:
   * - `invisibleAccounts`: List of predicate addresses without balance.
   * - `accounts`: List of active `Vault` instances (with balance).
   *
   * @example
   * ```ts
   * const { invisibleAccounts, accounts } = await checkOlderPredicateVersions(
   *   "0x1234abcd...",
   *   "https://testnet.fuel.network/v1/graphql"
   * );
   *
   * console.log(invisibleAccounts); // ["0xabc123...", "0xdef456..."]
   * console.log(accounts); // [Vault {...}, Vault {...}]
   * ```
   */
  async checkOlderPredicateVersions(
    address: string,
    userType: TypeUser,
    provider: string,
  ): Promise<Vault[]> {
    const isEvm = BakoAddressUtils.isEvm(address);

    if (isEvm && userType === TypeUser.EVM) {
      const legacyVersions = await legacyConnectorVersion(address, provider);

      const vaults = await Promise.all(
        legacyVersions.map(async v => {
          const isFromConnector =
            v.details.origin === WalletType.EVM ||
            v.details.origin === WalletType.SVM;

          const config = isFromConnector
            ? { SIGNER: address }
            : { SIGNERS: [address], SIGNATURES_COUNT: 1 };

          return this.instancePredicate(
            JSON.stringify(config),
            provider,
            v.version,
          );
        }),
      );

      return vaults;
    }

    const latest = getLatestPredicateVersion(WalletType.FUEL);
    const config = { SIGNERS: [address], SIGNATURES_COUNT: 1 };

    const vault = await this.instancePredicate(
      JSON.stringify(config),
      provider,
      latest.version,
    );

    return [vault];
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

  async allocation({
    predicateId,
    user,
    network,
    assetsMap,
  }: IPredicateAllocationParams): Promise<IPredicateAllocation> {
    try {
      const query = Predicate.createQueryBuilder('p')
        .leftJoin('p.owner', 'owner')
        .leftJoin(
          'p.transactions',
          't',
          "t.status IN (:...status) AND regexp_replace(t.network->>'url', '^https?://[^@]+@', 'https://') = :network",
          {
            status: [
              TransactionStatus.AWAIT_REQUIREMENTS,
              TransactionStatus.PENDING_SENDER,
            ],
            network: network.url.replace(/^https?:\/\/[^@]+@/, 'https://'),
          },
        )
        .where('owner.id = :userId', { userId: user.id })
        .addSelect(['p.id', 'p.configurable', 't.txData']);

      if (predicateId) {
        query.andWhere('p.id = :predicateId', { predicateId });
      }

      const predicates = await query.getMany();
      const reservedCoins = predicates.map(predicate => ({
        configurable: predicate.configurable,
        version: predicate.version,
        coins: calculateReservedCoins(predicate.transactions),
      }));

      const allocationMap = new Map<string, AssetAllocation>();
      let totalAmountInUSD = 0;

      for (const { coins, configurable, version } of reservedCoins) {
        const instance = await this.instancePredicate(
          configurable,
          network.url,
          version,
        );

        const balances = (await instance.getBalances()).balances.filter(a =>
          a.amount.gt(0),
        );
        const assets =
          reservedCoins.length > 0 ? subCoins(balances, coins) : balances;

        const assetsWithoutNFT = assets.filter(({ amount, assetId }) => {
          const hasFuelMapped = assetsMap[assetId];
          const isOneUnit = amount.eq(1);
          const isNFT = !hasFuelMapped && isOneUnit;

          return !isNFT;
        });

        // Calculate total balance
        const totalBalance = await calculateBalanceUSD(
          assetsWithoutNFT,
          network.chainId,
        );
        const totalInNumber = parseFloat(totalBalance.replace(/,/g, ''));
        totalAmountInUSD += totalInNumber;

        // Calculate allocation
        for (const { assetId, amount } of assetsWithoutNFT) {
          const usdBalance = await calculateBalanceUSD(
            [{ assetId, amount }],
            network.chainId,
          );
          const usdInNumber = parseFloat(usdBalance.replace(/,/g, ''));

          const existingAllocation = allocationMap.get(assetId);

          const assetAllocation: AssetAllocation = {
            assetId,
            amountInUSD: existingAllocation
              ? existingAllocation.amountInUSD + usdInNumber
              : usdInNumber,
            amount: existingAllocation
              ? existingAllocation.amount.add(amount)
              : amount,
            percentage: 0,
          };

          allocationMap.set(assetId, assetAllocation);
        }
      }

      const allocationArray = Array.from(allocationMap.values())
        .filter(allocation => allocation.amountInUSD > 0)
        .map(allocation => ({
          ...allocation,
          percentage:
            totalAmountInUSD > 0
              ? (allocation.amountInUSD / totalAmountInUSD) * 100
              : 0,
        }));

      allocationArray.sort((a, b) => b.percentage - a.percentage);

      const top3 = allocationArray.slice(0, 3);

      const remaining = allocationArray.slice(3);

      const finalData = [...top3];

      if (remaining.length > 0) {
        const othersAmountInUSD = remaining.reduce(
          (sum, item) => sum + item.amountInUSD,
          0,
        );
        const othersPercentage = remaining.reduce(
          (sum, item) => sum + item.percentage,
          0,
        );
        const othersAmount = remaining.reduce(
          (sum, item) => sum.add(item.amount),
          bn(0),
        );

        finalData.push({
          assetId: null,
          amountInUSD: othersAmountInUSD,
          amount: othersAmount,
          percentage: othersPercentage,
        });
      }

      return {
        data: finalData,
        totalAmountInUSD,
      };
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on get predicate allocation',
        detail: error,
      });
    }
  }
}

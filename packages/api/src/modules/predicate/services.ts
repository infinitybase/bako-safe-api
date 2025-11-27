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
import { bn, BN, Network, ZeroBytes32 } from 'fuels';
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
        // Apply default limit to prevent loading entire table
        const DEFAULT_LIMIT = 100;
        const predicates = await queryBuilder.take(DEFAULT_LIMIT).getMany();
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

  /**
   * Extract signers info from vault configurable JSON
   */
  private parseVaultSigners(configurable: string): { members: number; minSigners: number } {
    try {
      const config = JSON.parse(configurable);
      const signers = (config.SIGNERS || []).filter(
        (addr: string) => addr !== '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
      return {
        members: signers.length,
        minSigners: config.SIGNATURES_COUNT || 1,
      };
    } catch {
      return { members: 1, minSigners: 1 };
    }
  }

  /**
   * Build final allocation response from processed data
   */
  private buildAllocationResponse(
    vaultInfoMap: Map<string, { name: string; address: string; members: number; minSigners: number; amountInUSD: number }>,
    allocationMap: Map<string, AssetAllocation>,
    totalAmountInUSD: number,
  ): IPredicateAllocation {
    // Calculate percentages and sort
    const allocationArray = Array.from(allocationMap.values())
      .filter(allocation => allocation.amountInUSD > 0)
      .map(allocation => ({
        ...allocation,
        percentage: totalAmountInUSD > 0 ? (allocation.amountInUSD / totalAmountInUSD) * 100 : 0,
      }));

    allocationArray.sort((a, b) => b.percentage - a.percentage);

    // Split into top 3 and others
    const top3 = allocationArray.slice(0, 3);
    const remaining = allocationArray.slice(3);
    const finalData = [...top3];

    if (remaining.length > 0) {
      finalData.push({
        assetId: null,
        amountInUSD: remaining.reduce((sum, item) => sum + item.amountInUSD, 0),
        amount: remaining.reduce((sum, item) => sum.add(item.amount), bn(0)),
        percentage: remaining.reduce((sum, item) => sum + item.percentage, 0),
      });
    }

    // Convert vaultInfoMap to array
    const predicatesArray = Array.from(vaultInfoMap.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      address: info.address,
      members: info.members,
      minSigners: info.minSigners,
      amountInUSD: info.amountInUSD,
    }));

    return {
      data: finalData,
      totalAmountInUSD,
      predicates: predicatesArray,
    };
  }

  async allocation({
    predicateId,
    user,
    network,
    assetsMap,
    limit,
  }: IPredicateAllocationParams): Promise<IPredicateAllocation> {
    try {
      // ========================================
      // PARALLEL: Fetch vault structures and cache data
      // ========================================
      const structureQuery = Predicate.createQueryBuilder('p')
        .distinctOn(['p.id'])
        .leftJoin('p.owner', 'owner')
        .leftJoin('p.members', 'members')
        .where('owner.id = :userId OR members.id = :userId', { userId: user.id })
        .select(['p.id', 'p.name', 'p.predicateAddress', 'p.configurable', 'p.version'])
        .orderBy('p.updatedAt', 'DESC');

      if (predicateId) {
        structureQuery.andWhere('p.id = :predicateId', { predicateId });
      }
      if (limit) {
        structureQuery.limit(limit);
      }

      // Run vault query and cache fetch in parallel
      const [vaultStructures, { fuelUnitAssets }, quotes] = await Promise.all([
        structureQuery.getMany(),
        import('@src/utils/assets').then(m => m.getAssetsMaps()),
        App.getInstance()._quoteCache.getActiveQuotes(),
      ]);

      // Build vault info map from structures
      const vaultInfoMap = new Map<string, {
        name: string;
        address: string;
        members: number;
        minSigners: number;
        configurable: string;
        version: string;
        amountInUSD: number;
      }>();

      for (const vault of vaultStructures) {
        const { members, minSigners } = this.parseVaultSigners(vault.configurable);
        vaultInfoMap.set(vault.id, {
          name: vault.name,
          address: vault.predicateAddress,
          members,
          minSigners,
          configurable: vault.configurable,
          version: vault.version,
          amountInUSD: 0,
        });
      }

      const vaultIds = Array.from(vaultInfoMap.keys());

      if (vaultIds.length === 0) {
        return { data: [], totalAmountInUSD: 0, predicates: [] };
      }

      // ========================================
      // PARALLEL: Fetch reserved coins and balances
      // ========================================
      const transactionsQuery = Predicate.createQueryBuilder('p')
        .leftJoin(
          'p.transactions',
          't',
          "t.status IN (:...status) AND regexp_replace(t.network->>'url', '^https?://[^@]+@', 'https://') = :network",
          {
            status: [TransactionStatus.AWAIT_REQUIREMENTS, TransactionStatus.PENDING_SENDER],
            network: network.url.replace(/^https?:\/\/[^@]+@/, 'https://'),
          },
        )
        .where('p.id IN (:...vaultIds)', { vaultIds })
        .select(['p.id', 't.txData']);

      // Fetch reserved coins query (runs in parallel with balance fetches)
      const reservedCoinsPromise = transactionsQuery.getMany().then(predicatesWithTx => {
        const map = new Map<string, ReturnType<typeof calculateReservedCoins>>();
        for (const pred of predicatesWithTx) {
          map.set(pred.id, calculateReservedCoins(pred.transactions));
        }
        return map;
      });

      // Fetch all balances in parallel with error handling per vault
      const balancesPromise = Promise.all(
        Array.from(vaultInfoMap.entries()).map(async ([vaultId, info]) => {
          try {
            const instance = await this.instancePredicate(info.configurable, network.url, info.version);
            const balances = (await instance.getBalances()).balances.filter(a => a.amount.gt(0));
            return { vaultId, balances };
          } catch (err) {
            console.warn(`[ALLOCATION] Failed to get balances for vault ${vaultId}:`, err?.message);
            return { vaultId, balances: [] };
          }
        }),
      );

      // Wait for both to complete
      const [reservedCoinsMap, vaultBalances] = await Promise.all([
        reservedCoinsPromise,
        balancesPromise,
      ]);

      // ========================================
      // Process balances and build allocation
      // ========================================
      const calculateBalanceUSD = (assetId: string, amount: BN): number => {
        try {
          const units = fuelUnitAssets(network.chainId, assetId);
          const formattedAmount = amount.format({ units }).replace(/,/g, '');
          const priceUSD = quotes[assetId] ?? 0;
          return parseFloat(formattedAmount) * priceUSD;
        } catch (err) {
          console.warn(`[ALLOCATION] Error calculating USD for asset ${assetId}:`, err?.message);
          return 0;
        }
      };

      const allocationMap = new Map<string, AssetAllocation>();
      let totalAmountInUSD = 0;

      for (const { vaultId, balances } of vaultBalances) {
        const vaultInfo = vaultInfoMap.get(vaultId);
        if (!vaultInfo) continue;

        const reservedCoins = reservedCoinsMap.get(vaultId) || [];
        const assets = reservedCoins.length > 0 ? subCoins(balances, reservedCoins) : balances;

        // Filter out NFTs
        const assetsWithoutNFT = assets.filter(({ amount, assetId }) => {
          const hasFuelMapped = assetsMap[assetId];
          const isOneUnit = amount.eq(1);
          return !((!hasFuelMapped && isOneUnit));
        });

        for (const { assetId, amount } of assetsWithoutNFT) {
          const usdBalance = calculateBalanceUSD(assetId, amount);
          totalAmountInUSD += usdBalance;
          vaultInfo.amountInUSD += usdBalance;

          const existing = allocationMap.get(assetId);
          allocationMap.set(assetId, {
            assetId,
            amountInUSD: existing ? existing.amountInUSD + usdBalance : usdBalance,
            amount: existing ? existing.amount.add(amount) : amount,
            percentage: 0,
          });
        }
      }

      return this.buildAllocationResponse(vaultInfoMap, allocationMap, totalAmountInUSD);
    } catch (error) {
      console.error('[ALLOCATION_ERROR]', {
        message: error?.message || error,
        stack: error?.stack,
        userId: user?.id,
        predicateId,
        networkUrl: network?.url,
      });
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on get predicate allocation',
        detail: error?.message || error,
      });
    }
  }
}

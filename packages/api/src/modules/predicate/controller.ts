import { TransactionStatus } from 'bakosafe';
import { logger } from '@src/config/logger';

import { Predicate } from '@src/models/Predicate';
import { Workspace } from '@src/models/Workspace';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';

import { NotificationTitle } from '@models/index';

import { error, ErrorTypes, NotFound } from '@utils/error';
import {
  Responses,
  bindMethods,
  calculateBalanceUSD,
  calculateReservedCoins,
  getAssetsMaps,
  subCoins,
  successful,
} from '@utils/index';

import { INotificationService } from '../notification/types';

import { WorkspaceService } from '../workspace/services';
import {
  ICheckPredicateBalancesRequest,
  ICreatePredicateRequest,
  IDeletePredicateRequest,
  IFindByHashRequest,
  IFindByIdRequest,
  IFindByNameRequest,
  IGetAllocationRequest,
  IListRequest,
  IPredicateService,
  ITooglePredicateRequest,
  IUpdatePredicateRequest,
  PredicateWithHidden,
} from './types';

import { NotificationService } from '../notification/services';
import { PredicateService } from './services';
const { FUEL_PROVIDER } = process.env;

export class PredicateController {
  private predicateService: IPredicateService;
  private notificationService: INotificationService;

  constructor(
    predicateService: IPredicateService,
    notificationService: INotificationService,
  ) {
    this.predicateService = predicateService;
    this.notificationService = notificationService;
    bindMethods(this);
  }

  // force deploy
  async create({
    body: payload,
    user,
    network,
    workspace,
  }: ICreatePredicateRequest) {
    logger.info(
      {
        name: payload?.name,
        predicateAddress: payload?.predicateAddress,
        userId: user?.id,
        workspaceId: workspace?.id,
      },
      '[PREDICATE_CREATE] Starting predicate creation',
    );

    try {
      // If workspace is not provided, use user's single workspace as default
      let effectiveWorkspace = workspace;
      if (!workspace?.id) {
        logger.info(
          '[PREDICATE_CREATE] No workspace provided, fetching user single workspace',
        );
        effectiveWorkspace = await new WorkspaceService()
          .filter({ user: user.id, single: true })
          .list()
          .then((response: Workspace[]) => response[0]);
        logger.info(
          { workspaceId: effectiveWorkspace?.id },
          '[PREDICATE_CREATE] Using single workspace:',
        );
      }

      const predicateService = new PredicateService();
      const predicate = await predicateService.create(
        payload,
        network,
        user,
        effectiveWorkspace,
      );

      logger.info(
        {
          predicateId: predicate?.id,
          predicateName: predicate?.name,
        },
        '[PREDICATE_CREATE] Predicate created successfully',
      );

      const notifyDestination = predicate.members.filter(
        member => user.id !== member.id,
      );
      const notifyContent = {
        vaultId: predicate.id,
        vaultName: predicate.name,
        workspaceId: effectiveWorkspace.id,
      };

      await Promise.all(
        notifyDestination.map(async member => {
          await Promise.all([
            this.notificationService.create({
              title: NotificationTitle.NEW_VAULT_CREATED,
              user_id: member.id,
              summary: notifyContent,
              network,
            }),
            member.notify && member.email
              ? sendMail(EmailTemplateType.VAULT_CREATED, {
                  to: member.email,
                  data: {
                    summary: { ...notifyContent, name: member?.name ?? '' },
                  },
                }).catch(e => {
                  logger.error(
                    {
                      to: member.email,
                      memberId: member?.id,
                      predicateId: predicate.id,
                      error: e,
                    },
                    '[PREDICATE_CREATE] Failed to send vault creation email',
                  );
                })
              : Promise.resolve(),
          ]);
        }),
      );

      await new NotificationService().vaultUpdate(predicate.id);

      return successful(predicate, Responses.Created);
    } catch (e) {
      logger.error(
        {
          message: e?.message || e,
          name: e?.name,
          stack: e?.stack?.slice(0, 500),
        },
        '[PREDICATE_CREATE]',
      );
      return error(e.error, e.statusCode);
    }
  }

  async delete({ params: { id } }: IDeletePredicateRequest) {
    try {
      const response = await this.predicateService.delete(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findById({ params: { predicateId } }: IFindByIdRequest) {
    try {
      const predicate = await this.predicateService.findById(predicateId);

      return successful(predicate, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByAddress({ params: { address } }: IFindByHashRequest) {
    try {
      logger.info(
        { address },
        '[PREDICATE_FIND_BY_ADDRESS] Looking for predicate:',
      );
      const predicate = await this.predicateService.findByAddress(address);

      if (!predicate) {
        logger.info(
          { address },
          '[PREDICATE_FIND_BY_ADDRESS] Predicate NOT found for address:',
        );
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `No predicate found with address ${address}`,
        });
      }

      logger.info(
        {
          predicateId: predicate.id,
          predicateName: predicate.name,
          membersCount: predicate.members?.length,
        },
        '[PREDICATE_FIND_BY_ADDRESS] Predicate found',
      );

      return successful(predicate, Responses.Ok);
    } catch (e) {
      logger.error({ error: e?.message || e }, '[PREDICATE_FIND_BY_ADDRESS]');
      return error(e.error, e.statusCode);
    }
  }

  async findByName(req: IFindByNameRequest) {
    const { ignoreId } = req.query;
    const { params, workspace } = req;
    const { name } = params;

    try {
      if (!name || name.length === 0) return successful(false, Responses.Ok);

      const response = await Predicate.createQueryBuilder('p')
        .leftJoin('p.workspace', 'w')
        .addSelect(['w.id', 'w.name'])
        .where('LOWER(p.name) = LOWER(:name)', { name: name })
        .andWhere('w.id = :workspace', { workspace: workspace.id })
        .getOne();

      if (ignoreId && response?.id === ignoreId) {
        return successful(false, Responses.Ok);
      }

      return successful(!!response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async hasReservedCoins({ params: { predicateId }, network }: IFindByIdRequest) {
    try {
      const { assetsMapById } = await getAssetsMaps();
      const queryResult = await Predicate.createQueryBuilder('p')
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
        .addSelect(['t', 'p.id', 'p.configurable'])
        .where('p.id = :predicateId', { predicateId })
        .getOne();

      const predicateTxs = queryResult?.transactions ?? [];
      const configurable = queryResult?.configurable;
      const reservedCoins = calculateReservedCoins(predicateTxs);

      const instance = await this.predicateService.instancePredicate(
        configurable,
        network.url ?? FUEL_PROVIDER,
        queryResult.version,
      );

      const balances = (await instance.getBalances()).balances.filter(a =>
        a.amount.gt(0),
      );
      const allAssets =
        reservedCoins.length > 0 ? subCoins(balances, reservedCoins) : balances;

      const nfts = [];
      const assets = allAssets.filter(({ amount, assetId }) => {
        const hasFuelMapped = assetsMapById[assetId];
        const isOneUnit = amount.eq(1);
        const is = !hasFuelMapped && isOneUnit;

        if (is) nfts.push({ amount, assetId });

        return !is;
      });

      return successful(
        {
          reservedCoinsUSD: await calculateBalanceUSD(
            reservedCoins,
            network.chainId,
          ), // locked value on USDC
          totalBalanceUSD: await calculateBalanceUSD(balances, network.chainId),
          currentBalanceUSD: await calculateBalanceUSD(assets, network.chainId),
          currentBalance: assets,
          totalBalance: balances,
          reservedCoins: reservedCoins, // locked coins
          nfts,
        },
        Responses.Ok,
      );
    } catch (e) {
      logger.error({ error: e }, '[RESERVED_COINS_ERROR]');
      return error(e.error || e, e.statusCode);
    }
  }

  async list(req: IListRequest) {
    const {
      provider,
      address: predicateAddress,
      owner,
      orderByRoot,
      orderBy,
      sort,
      page,
      perPage,
      q,
    } = req.query;

    const { workspace, user } = req;
    const hidden = req.query.hidden === 'true';

    try {
      const singleWorkspace = await new WorkspaceService()
        .filter({ user: user.id, single: true })
        .list()
        .then((response: Workspace[]) => response[0]);

      const hasSingle = singleWorkspace.id === workspace.id;

      const _wk = hasSingle
        ? await new WorkspaceService()
            .filter({ user: user.id })
            .list()
            .then((response: Workspace[]) => response.map(wk => wk.id))
        : [workspace.id];

      const response = await this.predicateService
        .filter({
          address: predicateAddress,
          provider,
          owner,
          q,
          workspace: _wk,
          signer: hasSingle ? user.address : undefined,
          hidden,
          userId: user.id,
        })
        .ordination({ orderByRoot, orderBy, sort })
        .paginate({ page, perPage })
        .list();

      const addHiddenFlag = (vault: Predicate): PredicateWithHidden => {
        return {
          ...vault,
          isHidden: vault.isHiddenForUser(user),
        };
      };

      let processedResponse;

      if ('data' in response) {
        const enhancedData = response.data.map(addHiddenFlag);
        processedResponse = {
          ...response,
          data: enhancedData.filter(vault => (hidden ? true : !vault.isHidden)),
        };
      } else {
        const enhancedData = response.map(addHiddenFlag);
        processedResponse = {
          ...response,
          data: enhancedData.filter(vault => (hidden ? true : !vault.isHidden)),
        };
      }

      return successful(processedResponse, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async checkByAddress({ params: { address } }: IFindByHashRequest) {
    try {
      const predicate = await this.predicateService.findByAddress(address);

      return successful(!!predicate, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
  async tooglePredicateVisibility({
    user,
    params: { address },
    headers,
  }: ITooglePredicateRequest) {
    try {
      const updatedSettings = await this.predicateService.togglePredicateStatus(
        user.id,
        address,
        headers.authorization,
      );

      return successful(updatedSettings, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async listAll(req: IListRequest) {
    const { page, perPage, d } = req.query;

    try {
      const response = await this.predicateService
        .paginate({ page, perPage })
        .filter({
          select: [
            'p.id',
            'p.predicateAddress',
            'p.createdAt',
            'p.root',
            'owner.id',
          ],
        })
        .listDateMoreThan(d ? new Date(d) : undefined);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async update(req: IUpdatePredicateRequest) {
    try {
      const { predicateId } = req.params;
      const { description, name } = req.body;

      const updatedPredicate = await this.predicateService.update(predicateId, {
        name,
        description,
      });

      return successful(updatedPredicate, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async allocation({ params, user, network }: IGetAllocationRequest) {
    const { predicateId } = params;
    try {
      const allocation = await this.predicateService.allocation({
        user,
        predicateId,
        network,
        assetsMap: (await getAssetsMaps()).assetsMapById,
      });

      return successful(allocation, Responses.Ok);
    } catch (e) {
      return error(e.error || e, e.statusCode);
    }
  }

  async checkPredicateBalances({
    params: { predicateId },
    user,
    network,
  }: ICheckPredicateBalancesRequest) {
    try {
      await this.predicateService.checkBalances({
        predicateId,
        userId: user.id,
        network,
      });
      return successful(null, Responses.Ok);
    } catch (e) {
      return error(e.error || e, e.statusCode);
    }
  }
}

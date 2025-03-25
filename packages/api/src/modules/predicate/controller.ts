import { TransactionStatus } from 'bakosafe';

import { Predicate } from '@src/models/Predicate';
import { Workspace } from '@src/models/Workspace';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';

import { NotificationTitle } from '@models/index';

import { error } from '@utils/error';
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
  ICreatePredicateRequest,
  IDeletePredicateRequest,
  IFindByHashRequest,
  IFindByIdRequest,
  IFindByNameRequest,
  IListRequest,
  IPredicateService,
  ITooglePredicateRequest,
  PredicateWithHidden,
} from './types';

import { PredicateService } from './services';
import { NotificationService } from '../notification/services';
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
    const predicateService = new PredicateService();
    const predicate = await predicateService.create(
      payload,
      network,
      user,
      workspace,
    );

    const notifyDestination = predicate.members.filter(
      member => user.id !== member.id,
    );
    const notifyContent = {
      vaultId: predicate.id,
      vaultName: predicate.name,
      workspaceId: workspace.id,
    };
    for await (const member of notifyDestination) {
      await this.notificationService.create({
        title: NotificationTitle.NEW_VAULT_CREATED,
        user_id: member.id,
        summary: notifyContent,
        network,
      });

      if (member.notify) {
        await sendMail(EmailTemplateType.VAULT_CREATED, {
          to: member.email,
          data: { summary: { ...notifyContent, name: member?.name ?? '' } },
        });
      }
    }

    await new NotificationService().vaultUpdate(predicate.id);

    return successful(predicate, Responses.Ok);
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
      const predicate = await this.predicateService.findByAddress(address);

      return successful(predicate, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByName(req: IFindByNameRequest) {
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

      const balances = (await instance.getBalances()).balances;
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
      console.log(`[RESERVED_COINS_ERROR]`, e);
      return error(e.error, e.statusCode);
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
        })
        .ordination({ orderByRoot, orderBy, sort })
        .paginate({ page, perPage })
        .list();

      const addHiddenFlag = (vault: Predicate): PredicateWithHidden => {
        const predicateAddress = vault.predicateAddress.toLowerCase();
        const inactives =
          user.settings?.inactivesPredicates.map(addr => addr.toLowerCase()) || [];
        const isHidden = inactives.includes(predicateAddress);

        return Object.assign({}, vault, { isHidden });
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
    body: { address },
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
}

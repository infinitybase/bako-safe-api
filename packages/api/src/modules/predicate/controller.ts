import { TransactionStatus } from 'bakosafe';

import { Predicate } from '@src/models/Predicate';
import { Workspace } from '@src/models/Workspace';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';
import { IconUtils } from '@src/utils/icons';

import { NotificationTitle, TypeUser, User } from '@models/index';

import { error } from '@utils/error';
import {
  Responses,
  bindMethods,
  calculateBalanceUSD,
  calculateReservedCoins,
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
} from './types';

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
      workspaceId: predicate.workspace.id,
    };

    for await (const member of notifyDestination) {
      await this.notificationService.create({
        title: NotificationTitle.NEW_VAULT_CREATED,
        user_id: member.id,
        summary: notifyContent,
      });

      if (member.notify) {
        await sendMail(EmailTemplateType.VAULT_CREATED, {
          to: member.email,
          data: { summary: { ...notifyContent, name: member?.name ?? '' } },
        });
      }
    }

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
      const predicate = await Predicate.findOne({
        where: { predicateAddress: address },
      });

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
        .where('p.name = :name', { name })
        .andWhere('w.id = :workspace', { workspace: workspace.id })
        .getOne();

      return successful(!!response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async hasReservedCoins({ params: { predicateId } }: IFindByIdRequest) {
    try {
      const {
        transactions: predicateTxs,
        configurable,
      } = await Predicate.createQueryBuilder('p')
        .leftJoin('p.transactions', 't', 't.status IN (:...status)', {
          status: [
            TransactionStatus.AWAIT_REQUIREMENTS,
            TransactionStatus.PENDING_SENDER,
          ],
        })
        .leftJoin('p.version', 'pv')
        .addSelect(['t', 'p.id', 'p.configurable', 'pv.code'])
        .where('p.id = :predicateId', { predicateId })
        .getOne();

      const reservedCoins = calculateReservedCoins(predicateTxs);

      const instance = await this.predicateService.instancePredicate(
        configurable,
        FUEL_PROVIDER,
      );
      const balances = (await instance.getBalances()).balances;
      const assets =
        reservedCoins.length > 0 ? subCoins(balances, reservedCoins) : balances;

      return successful(
        {
          reservedCoinsUSD: calculateBalanceUSD(reservedCoins), // locked value on USDC
          totalBalanceUSD: calculateBalanceUSD(balances),
          currentBalanceUSD: calculateBalanceUSD(assets),
          currentBalance: assets,
          totalBalance: balances,
          reservedCoins: reservedCoins, // locked coins
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

    try {
      const singleWorkspace = await new WorkspaceService()
        .filter({
          user: user.id,
          single: true,
        })
        .list()
        .then((response: Workspace[]) => response[0]);

      const hasSingle = singleWorkspace.id === workspace.id;

      const _wk = hasSingle
        ? await new WorkspaceService()
            .filter({
              user: user.id,
            })
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

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

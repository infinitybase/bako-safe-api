import axios from 'axios';
import { TransactionStatus } from 'bakosafe';
import { bn } from 'fuels';

import { Predicate } from '@src/models/Predicate';
import { Workspace } from '@src/models/Workspace';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';
import { IconUtils } from '@src/utils/icons';

import {
  Asset,
  NotificationTitle,
  Transaction,
  TransactionType,
  TypeUser,
  User,
} from '@models/index';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { INotificationService } from '../notification/types';
import { ITransactionService } from '../transaction/types';
import { IUserService } from '../user/types';
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
import { IPredicateVersionService } from '../predicateVersion/types';

export class PredicateController {
  private userService: IUserService;
  private predicateService: IPredicateService;
  private predicateVersionService: IPredicateVersionService;
  private transactionService: ITransactionService;
  private notificationService: INotificationService;

  constructor(
    userService: IUserService,
    predicateService: IPredicateService,
    predicateVersionService: IPredicateVersionService,
    transactionService: ITransactionService,
    notificationService: INotificationService,
  ) {
    this.userService = userService;
    this.predicateService = predicateService;
    this.predicateVersionService = predicateVersionService;
    this.transactionService = transactionService;
    this.notificationService = notificationService;
    bindMethods(this);
  }

  async create({ body: payload, user, workspace }: ICreatePredicateRequest) {
    const { versionCode } = payload;

    try {
      const members: User[] = [];

      for await (const member of payload.addresses) {
        let user = await this.userService.findByAddress(member);

        if (!user) {
          user = await this.userService.create({
            address: member,
            provider: payload.provider,
            avatar: IconUtils.user(),
            type: TypeUser.FUEL,
          });
        }

        members.push(user);
      }

      let version = null;

      if (versionCode) {
        version = await this.predicateVersionService.findByCode(versionCode);
      } else {
        version = await this.predicateVersionService.findCurrentVersion();
      }

      const newPredicate = await this.predicateService.create({
        ...payload,
        owner: user,
        members,
        workspace,
        version,
      });

      // include signer permission to vault on workspace
      await new WorkspaceService().includeSigner(
        members.map(member => member.id),
        newPredicate.id,
        workspace.id,
      );

      const { id, name, members: predicateMembers } = newPredicate;
      const summary = { vaultId: id, vaultName: name };
      const membersWithoutLoggedUser = predicateMembers.filter(
        member => member.id !== user.id,
      );

      for await (const member of membersWithoutLoggedUser) {
        await this.notificationService.create({
          title: NotificationTitle.NEW_VAULT_CREATED,
          user_id: member.id,
          summary,
        });

        if (member.notify) {
          await sendMail(EmailTemplateType.VAULT_CREATED, {
            to: member.email,
            data: { summary: { ...summary, name: member?.name ?? '' } },
          });
        }
      }

      const result = await this.predicateService
        .filter(undefined)
        .findById(newPredicate.id);

      return successful(result, Responses.Ok);
    } catch (e) {
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

  async findById({ params: { id }, user }: IFindByIdRequest) {
    try {
      const { predicate, missingDeposits } = await this.predicateService.findById(
        id,
        user.address,
      );

      if (missingDeposits.length >= 1) {
        for (const deposit of missingDeposits) {
          console.log('Processing deposit:', deposit);

          try {
            await this.transactionService.create({
              // em transaction "normal" o nome do campo é id, nos depositos é TXID
              txData: deposit.txData,
              type: TransactionType.DEPOSIT,
              // verificar name e hash, esse são valores provisórios
              name: deposit.id,
              hash: deposit.id,
              sendTime: deposit.date,
              gasUsed: deposit.gasUsed,
              predicateId: predicate.id,
              status: TransactionStatus.SUCCESS,
              resume: {
                // verificar hash
                hash: deposit.id,
                status: TransactionStatus.SUCCESS,
                witnesses: [predicate.owner.address],
                // Corrigir tipagem
                // @ts-ignore
                outputs: deposit.operations.map(({ assetsSent, to, from }) => ({
                  // Corrigir tipagem
                  // @ts-ignore
                  amount: String(assetsSent[0].amount.format()),
                  to,
                  from,
                  assetId: assetsSent[0].assetId,
                })),
                requiredSigners: predicate.minSigners,
                totalSigners: predicate.members.length,
                predicate: {
                  id: predicate.id,
                  address: predicate.predicateAddress,
                },
                BakoSafeID: '',
              },
              witnesses: [
                {
                  ...predicate.owner,
                  account: predicate.owner.id,
                  createdAt: deposit.date,
                },
              ],
              predicate,
              createdBy: predicate.owner,
              summary: null,
            });
          } catch (error) {
            console.error('Error saving deposit:', deposit, error);
          }
        }
      }

      return successful(predicate, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByAddress({ params: { address } }: IFindByHashRequest) {
    try {
      const response = await Predicate.findOne({
        where: { predicateAddress: address },
      })

      const { predicate } = await this.predicateService.findById(
        response.id,
        undefined,
      );

      return successful(predicate, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByName(req: IFindByNameRequest) {
    const { params, workspace } = req;
    const { name } = params;
    try {
      if(!name || name.length === 0) return successful(false, Responses.Ok);

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

  async hasReservedCoins({ params: { address } }: IFindByHashRequest) {
    try {
      const response = await this.transactionService
        .filter({
          predicateId: [address],
        })
        .list()
        .then((data: Transaction[]) => {
          return data
            .filter(
              (transaction: Transaction) =>
                transaction.status === TransactionStatus.AWAIT_REQUIREMENTS ||
                transaction.status === TransactionStatus.PENDING_SENDER,
            )
            .reduce((accumulator, transaction: Transaction) => {
              return accumulator.add(
                transaction.assets.reduce((assetAccumulator, asset: Asset) => {
                  return assetAccumulator.add(bn.parseUnits(asset.amount));
                }, bn.parseUnits('0')),
              );
            }, bn.parseUnits('0'));
        })
        .catch(e => {
          return bn.parseUnits('0');
        });

      const { predicate } = await this.predicateService.findById(
        address,
        undefined,
      );

      const instance = await this.predicateService.instancePredicate(predicate.id);
      const balance = await instance.getBalance();

      //todo: move this calc logic
      const convert = `ETH-USD`;

      const priceUSD: number = await axios
        .get(`https://economia.awesomeapi.com.br/last/${convert}`)
        .then(({ data }) => {
          return data[convert.replace('-', '')].bid ?? 0.0;
        })
        .catch(e => {
          return 0.0;
        });

      return successful(
        {
          balance: balance.format().toString(),
          balanceUSD: (parseFloat(balance.format().toString()) * priceUSD).toFixed(
            2,
          ),
          reservedCoins: response,
        },
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list(req: IListRequest) {
    const {
      provider,
      address: predicateAddress,
      owner,
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
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

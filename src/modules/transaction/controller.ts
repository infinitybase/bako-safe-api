import { ITransactionResume, TransactionStatus } from 'bsafe';
import { Provider, Signer, hashMessage } from 'fuels';

import AddressBook from '@src/models/AddressBook';
import { PermissionRoles, Workspace } from '@src/models/Workspace';
import {
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error/Unauthorized';
import { IPagination } from '@src/utils/pagination';
import {
  validatePermissionVault,
  validatePermissionGeneral,
} from '@src/utils/permissionValidate';

import {
  NotificationTitle,
  Predicate,
  Transaction,
  WitnessesStatus,
} from '@models/index';

import { IPredicateService } from '@modules/predicate/types';
import { IWitnessService } from '@modules/witness/types';

import { ErrorTypes, NotFound, error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IAddressBookService } from '../addressBook/types';
import { IAssetService } from '../asset/types';
import { INotificationService } from '../notification/types';
import { PredicateService } from '../predicate/services';
import { UserService } from '../user/service';
import { WorkspaceService } from '../workspace/services';
import { TransactionService } from './services';
import {
  ICloseTransactionRequest,
  ICreateTransactionRequest,
  IFindTransactionByHashRequest,
  IFindTransactionByIdRequest,
  IListRequest,
  ISendTransactionRequest,
  ISignByIdRequest,
  ITransactionService,
} from './types';

export class TransactionController {
  private transactionService: ITransactionService;
  private predicateService: IPredicateService;
  private witnessService: IWitnessService;
  private addressBookService: IAddressBookService;
  private notificationService: INotificationService;

  constructor(
    transactionService: ITransactionService,
    predicateService: IPredicateService,
    witnessService: IWitnessService,
    addressBookService: IAddressBookService,
    assetService: IAssetService,
    notificationService: INotificationService,
  ) {
    Object.assign(this, {
      transactionService,
      predicateService,
      witnessService,
      addressBookService,
      assetService,
      notificationService,
    });
    bindMethods(this);
  }

  async pending(req: IListRequest) {
    try {
      const { workspace, user } = req;
      const { predicateId } = req.query;
      const { workspaceList, hasSingle } = await new UserService().workspacesByUser(
        workspace,
        user,
      );

      const result = await new TransactionService()
        .filter({
          status: [TransactionStatus.AWAIT_REQUIREMENTS],
          signer: hasSingle ? user.address : undefined,
          workspaceId: workspaceList,
          predicateId,
        })
        .list()
        .then((result: Transaction[]) => {
          return {
            ofUser:
              result.filter(transaction =>
                transaction.witnesses.find(
                  w =>
                    w.account === user.address &&
                    w.status === WitnessesStatus.PENDING,
                ),
              ).length ?? 0,
            transactionsBlocked:
              result.filter(transaction =>
                transaction.witnesses.find(
                  w => w.status === WitnessesStatus.PENDING,
                ),
              ).length > 0 ?? false,
          };
        });
      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async create({ body: transaction, user, workspace }: ICreateTransactionRequest) {
    const { predicateAddress, summary } = transaction;

    try {
      const predicate = await new PredicateService()
        .filter({ address: predicateAddress })
        .list()
        .then((result: Predicate[]) => result[0]);

      // if possible move this next part to a middleware, but we dont have access to body of request
      // ========================================================================================================
      const hasPermission = validatePermissionGeneral(workspace, user.id, [
        PermissionRoles.OWNER,
        PermissionRoles.ADMIN,
        PermissionRoles.MANAGER,
      ]);
      const isMemberOfPredicate = predicate.members.find(
        member => member.id === user.id,
      );

      if (!isMemberOfPredicate && !hasPermission) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.MISSING_PERMISSION,
          detail: 'You do not have permission to access this resource',
        });
      }
      // ========================================================================================================

      const witnesses = predicate.members.map(member => ({
        account: member.address,
        status: WitnessesStatus.PENDING,
        signature: null,
      }));

      const newTransaction = await this.transactionService.create({
        ...transaction,
        status: TransactionStatus.AWAIT_REQUIREMENTS,
        resume: {
          hash: transaction.hash,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
          witnesses: witnesses.filter(w => !!w.signature).map(w => w.signature),
          outputs: transaction.assets.map(({ amount, to, assetId }) => ({
            amount,
            to,
            assetId,
          })),
          requiredSigners: predicate.minSigners,
          totalSigners: predicate.members.length,
          predicate: {
            id: predicate.id,
            address: predicate.predicateAddress,
          },
        },
        witnesses,
        predicate,
        createdBy: user,
        summary,
      });

      await new PredicateService().update(predicate.id);

      const { id, name } = newTransaction;
      const membersWithoutLoggedUser = predicate.members.filter(
        member => member.id !== user.id,
      );

      for await (const member of membersWithoutLoggedUser) {
        await this.notificationService.create({
          title: NotificationTitle.TRANSACTION_CREATED,
          summary: {
            vaultId: predicate.id,
            vaultName: predicate.name,
            transactionName: name,
            transactionId: id,
          },
          user_id: member.id,
        });
      }

      return successful(newTransaction, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findById({ params: { id } }: IFindTransactionByIdRequest) {
    try {
      const response = await this.transactionService
        .findById(id)
        .then(async (data: Transaction) => {
          const { status, predicate } = data;
          if (status === TransactionStatus.PROCESS_ON_CHAIN) {
            const provider = await Provider.create(predicate.provider);
            const result = await this.transactionService.verifyOnChain(
              data,
              provider,
            );
            return await this.transactionService.update(id, {
              status: result.status,
              resume: result,
            });
          }
          return data;
        });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByHash({ params: { hash } }: IFindTransactionByHashRequest) {
    try {
      const response = await this.transactionService
        .filter({ hash })
        .paginate(undefined)
        .list()
        .then((result: Transaction[]) => {
          return result[0];
        });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async signByID({
    body: { account, signer, confirm },
    params: { id },
    user,
  }: ISignByIdRequest) {
    try {
      const transaction = await this.transactionService.findById(id);
      //console.log('[ASSINATURA] --------->');
      const {
        witnesses,
        resume,
        predicate,
        name,
        id: transactionId,
        hash,
      } = transaction;
      const _resume = resume;

      const witness = witnesses.find(w => w.account === account);

      // console.log(
      //   '[VALIDACAO DE ASSINATURA]: ',
      //   Signer.recoverAddress(hashMessage(hash), signer).toString(),
      // );
      //validate signature

      // console.log(
      //   '[VALIDACAO DE ASSINATURA]: ',
      //   acc_signed,
      //   Signer.recoverAddress(hashMessage(hash), signer).toString(),
      // );
      if (signer && confirm) {
        const acc_signed =
          Signer.recoverAddress(hashMessage(hash), signer).toString() ==
          user.address;
        if (!acc_signed) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: UnauthorizedErrorTitles.INVALID_SIGNATURE,
            detail:
              'Your signature is invalid or does not match the transaction hash',
          });
        }
      }

      if (witness) {
        await this.witnessService.update(witness.id, {
          signature: signer,
          status: confirm ? WitnessesStatus.DONE : WitnessesStatus.REJECTED,
        }),
          _resume.witnesses.push(signer);

        const statusField = await this.transactionService.validateStatus(id);

        const result = await this.transactionService.update(id, {
          status: statusField,
          resume: {
            ..._resume,
            status: statusField,
          },
        });

        if (result.status === TransactionStatus.PENDING_SENDER) {
          await this.transactionService
            .sendToChain(id)
            .then(async (result: ITransactionResume) => {
              return await this.transactionService.update(id, {
                status: TransactionStatus.PROCESS_ON_CHAIN,
                sendTime: new Date(),
                resume: result,
              });
            })
            .catch(async () => {
              await this.transactionService.update(id, {
                status: TransactionStatus.FAILED,
                sendTime: new Date(),
              });
              throw new Error('Transaction send failed');
            });
        }

        const notificationSummary = {
          vaultId: predicate.id,
          vaultName: predicate.name,
          transactionId: transactionId,
          transactionName: name,
        };

        // NOTIFY MEMBERS ON SIGNED TRANSACTIONS
        if (confirm) {
          const membersWithoutLoggedUser = predicate.members.filter(
            member => member.id !== user.id,
          );

          for await (const member of membersWithoutLoggedUser) {
            await this.notificationService.create({
              title: NotificationTitle.TRANSACTION_SIGNED,
              summary: notificationSummary,
              user_id: member.id,
            });
          }
        }

        // NOTIFY MEMBERS ON FAILED TRANSACTIONS
        if (statusField === TransactionStatus.DECLINED) {
          for await (const member of predicate.members) {
            await this.notificationService.create({
              title: NotificationTitle.TRANSACTION_DECLINED,
              summary: notificationSummary,
              user_id: member.id,
            });
          }
        }
      }

      return successful(!!witness, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  // async list(req: IListRequest) {
  //   const {
  //     predicateId,
  //     to,
  //     status,
  //     orderBy,
  //     sort,
  //     page,
  //     perPage,
  //     limit,
  //     endDate,
  //     startDate,
  //     createdBy,
  //     name,
  //     allOfUser,
  //     id,
  //   } = req.query;
  //   const { user } = req;

  //   const _predicateId =
  //     typeof predicateId == 'string' ? [predicateId] : predicateId;
  //   const hasPagination = !!page && !!perPage;

  //   try {
  //     const predicateIds: string[] = allOfUser
  //       ? await this.predicateService
  //           .filter({ signer: user.address })
  //           .paginate(undefined)
  //           .list()
  //           .then((data: Predicate[]) => {
  //             return data.map(predicate => predicate.id);
  //           })
  //       : predicateId
  //       ? _predicateId
  //       : undefined;

  //     if (predicateIds && predicateIds.length === 0)
  //       return successful([], Responses.Ok);

  //     let response = await this.transactionService
  //       .filter({
  //         predicateId: predicateIds,
  //         to,
  //         status,
  //         endDate,
  //         startDate,
  //         createdBy,
  //         name,
  //         limit,
  //         id,
  //       })
  //       .ordination({ orderBy, sort })
  //       .paginate({ page, perPage })
  //       .list();

  //     let data = hasPagination
  //       ? (response as IPagination<Transaction>).data
  //       : (response as Transaction[]);

  //     const assets = data.map(i => i.assets);
  //     const recipientAddresses = assets.flat().map(i => i.to);
  //     const favorites = (await this.addressBookService
  //       .filter({ owner: [user.id], contactAddresses: recipientAddresses })
  //       .list()) as AddressBook[];

  //     if (favorites.length > 0) {
  //       data = (data.map(transaction => ({
  //         ...transaction,
  //         assets: transaction.assets.map(asset => ({
  //           ...asset,
  //           recipientNickname:
  //             favorites?.find(favorite => favorite.user.address === asset.to)
  //               ?.nickname ?? undefined,
  //         })),
  //       })) as unknown) as Transaction[];
  //     }

  //     response = hasPagination ? { ...response, data } : data;

  //     return successful(response, Responses.Ok);
  //   } catch (e) {
  //     return error(e.error, e.statusCode);
  //   }
  // }

  async list(req: IListRequest) {
    try {
      const {
        to,
        status,
        orderBy,
        sort,
        page,
        perPage,
        createdBy,
        predicateId,
        name,
      } = req.query;
      const { workspace, user } = req;

      const singleWorkspace = await new WorkspaceService()
        .filter({
          user: user.id,
          single: true,
        })
        .list()
        .then((response: Workspace[]) => response[0]);

      const allWk = await new WorkspaceService()
        .filter({
          user: user.id,
        })
        .list()
        .then((response: Workspace[]) => response.map(wk => wk.id));

      const hasSingle = singleWorkspace.id === workspace.id;

      const result = await new TransactionService()
        .filter({
          to,
          status: status ?? undefined,
          createdBy,
          name,
          workspaceId: hasSingle ? allWk : [workspace.id],
          signer: hasSingle ? user.address : undefined,
          predicateId: predicateId ?? undefined,
        })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async close({
    body: { gasUsed, transactionResult },
    params: { id },
  }: ICloseTransactionRequest) {
    try {
      const response = await this.transactionService.update(id, {
        status: TransactionStatus.SUCCESS,
        sendTime: new Date(),
        gasUsed,
        resume: transactionResult,
      });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async send({ params: { id } }: ISendTransactionRequest) {
    try {
      const resume = await this.transactionService
        .sendToChain(id)
        .then(async (result: ITransactionResume) => {
          return await this.transactionService.update(id, {
            status: TransactionStatus.PROCESS_ON_CHAIN,
            sendTime: new Date(),
            resume: result,
          });
        })
        .catch(async () => {
          await this.transactionService.update(id, {
            status: TransactionStatus.FAILED,
            sendTime: new Date(),
          });
          throw new Error('Transaction send failed');
        });

      return successful(resume, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async verifyOnChain({ params: { id } }: ISendTransactionRequest) {
    try {
      //console.log('[VERIFY_ON_CHAIN_CONTROLLER]');
      const api_transaction = await this.transactionService.findById(id);
      const { predicate, name, id: transactionId } = api_transaction;
      const provider = await Provider.create(predicate.provider);

      this.transactionService.checkInvalidConditions(api_transaction);

      const result = await this.transactionService.verifyOnChain(
        api_transaction,
        provider,
      );

      //console.log('[CONTROLLER]: ', result);
      // NOTIFY MEMBERS ON TRANSACTIONS SUCCESS (first solution, now is on the service)
      // if (result.status === TransactionStatus.SUCCESS) {
      //   for await (const member of predicate.members) {
      //     await this.notificationService.create({
      //       title: NotificationTitle.TRANSACTION_COMPLETED,
      //       summary: {
      //         vaultId: predicate.id,
      //         vaultName: predicate.name,
      //         transactionId: transactionId,
      //         transactionName: name,
      //       },
      //       user_id: member.id,
      //     });
      //   }
      // }

      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

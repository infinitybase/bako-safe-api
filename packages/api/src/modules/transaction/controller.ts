import { TransactionStatus, TransactionType, WitnessStatus } from 'bakosafe';
import { Provider } from 'fuels';
import { isUUID } from 'class-validator';
import { PermissionRoles, Workspace } from '@src/models/Workspace';
import {
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error/Unauthorized';
import { validatePermissionGeneral } from '@src/utils/permissionValidate';

import { NotificationTitle, Predicate, Transaction } from '@models/index';

import { IPredicateService } from '@modules/predicate/types';

import { error, ErrorTypes, NotFound } from '@utils/error';
import {
  bindMethods,
  generateWitnessesUpdatedAt,
  Responses,
  successful,
} from '@utils/index';

import { IAddressBookService } from '../addressBook/types';
import { INotificationService } from '../notification/types';
import { PredicateService } from '../predicate/services';
import { UserService } from '../user/service';
import { WorkspaceService } from '../workspace/services';
import { TransactionService } from './services';
import {
  ICloseTransactionRequest,
  ICreateTransactionHistoryRequest,
  ICreateTransactionRequest,
  IFindTransactionByHashRequest,
  IFindTransactionByIdRequest,
  IListRequest,
  IListWithIncomingsRequest,
  ISendTransactionRequest,
  ISignByIdRequest,
  ITransactionResponse,
  ITransactionService,
  TransactionHistory,
} from './types';
import { mergeTransactionLists } from './utils';

export class TransactionController {
  private transactionService: ITransactionService;
  private notificationService: INotificationService;
  private predicateService: IPredicateService;

  constructor(
    transactionService: ITransactionService,
    predicateService: IPredicateService,
    addressBookService: IAddressBookService,
    notificationService: INotificationService,
  ) {
    Object.assign(this, {
      transactionService,
      predicateService,
      addressBookService,
      notificationService,
    });
    bindMethods(this);
  }

  async pending(req: IListRequest) {
    try {
      const { workspace } = req;
      const { predicateId } = req.query;
      const predicate =
        predicateId && predicateId.length > 0 ? predicateId[0] : undefined;

      if (!predicate) {
        const qb = Transaction.createQueryBuilder('t')
          .innerJoinAndSelect('t.predicate', 'pred')
          .innerJoin('pred.workspace', 'wks', 'wks.id = :workspaceId', {
            workspaceId: workspace.id,
          })
          .addSelect(['t.status'])
          .where('t.status = :status', {
            status: TransactionStatus.AWAIT_REQUIREMENTS,
          });

        const result = await qb.getCount();

        return successful(
          {
            ofUser: result,
            transactionsBlocked: result > 0,
          },
          Responses.Ok,
        );
      }

      const qb = Transaction.createQueryBuilder('t')
        .where('t.status = :status', {
          status: TransactionStatus.AWAIT_REQUIREMENTS,
        })
        .andWhere('t.predicateId = :predicate', { predicate });

      const result = await qb.getCount();

      return successful(
        {
          ofUser: result,
          transactionsBlocked: result > 0,
        },
        Responses.Ok,
      );
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
        status: WitnessStatus.PENDING,
        signature: null,
        updatedAt: generateWitnessesUpdatedAt(),
      }));

      const newTransaction = await this.transactionService.create({
        ...transaction,
        type: Transaction.getTypeFromTransactionRequest(transaction.txData),
        status: TransactionStatus.AWAIT_REQUIREMENTS,
        resume: {
          hash: transaction.hash,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
          witnesses,
          requiredSigners: predicate.minSigners,
          totalSigners: predicate.members.length,
          predicate: {
            id: predicate.id,
            address: predicate.predicateAddress,
          },
          id: '',
        },
        predicate,
        createdBy: user,
        summary,
      });

      newTransaction.resume.id = newTransaction.id;
      await newTransaction.save();

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
            workspaceId: predicate.workspace.id,
          },
          user_id: member.id,
        });
      }

      return successful(newTransaction, Responses.Ok);
    } catch (e) {
      console.log(e);
      return error(e.error, e.statusCode);
    }
  }

  async createHistory({
    params: { id, predicateId },
  }: ICreateTransactionHistoryRequest) {
    try {
      const isUuid = isUUID(id);
      let result = null;

      if (isUuid) {
        result = await this.transactionService.findById(id);
      } else {
        const predicate = await this.predicateService.findById(predicateId);
        result = await this.transactionService.fetchFuelTransactionById(
          id,
          predicate,
        );
      }

      const response = await TransactionController.formatTransactionsHistory(
        result,
      );

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  static async formatTransactionsHistory(data: Transaction) {
    const userService = new UserService();
    const results = [];
    const _witnesses = data.resume.witnesses.filter(
      witness =>
        witness.status === WitnessStatus.DONE ||
        witness.status === WitnessStatus.REJECTED,
    );

    const witnessRejected = data.resume.witnesses.filter(
      witness => witness.status === WitnessStatus.REJECTED,
    );

    results.push({
      type: TransactionHistory.CREATED,
      date: data.createdAt,
      owner: {
        id: data.createdBy.id,
        avatar: data.createdBy.avatar,
        address: data.createdBy.address,
      },
    });

    for await (const witness of _witnesses) {
      const { avatar, id, address } = await userService.findByAddress(
        witness.account,
      );

      results.push({
        type:
          witness.status === WitnessStatus.REJECTED
            ? TransactionHistory.DECLINE
            : TransactionHistory.SIGN,
        date: witness.updatedAt,
        owner: {
          id,
          avatar,
          address,
        },
      });
    }

    if (data.status === TransactionStatus.SUCCESS) {
      results.push({
        type: TransactionHistory.SEND,
        date: data.sendTime,
        owner: {
          id: data.createdBy.id,
          avatar: data.createdBy.avatar,
          address: data.createdBy.address,
        },
      });
    }

    if (data.status === TransactionStatus.DECLINED && !witnessRejected) {
      results.push({
        type: TransactionHistory.DECLINE,
        date: data.updatedAt,
        owner: {
          id: data.createdBy.id,
          avatar: data.createdBy.avatar,
          address: data.createdBy.address,
        },
      });
    }

    if (data.status === TransactionStatus.FAILED) {
      results.push({
        type: TransactionHistory.FAILED,
        date: data.updatedAt,
        owner: {
          id: data.createdBy.id,
          avatar: data.createdBy.avatar,
          address: data.createdBy.address,
        },
      });
    }

    return results;
  }

  async findById({ params: { id } }: IFindTransactionByIdRequest) {
    try {
      const response = await this.transactionService
        .findById(id)
        .then(async (data: Transaction) => {
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
        .filter({ hash: hash.slice(2) })
        .paginate(undefined)
        .list()
        .then((result: ITransactionResponse[]) => {
          return result[0];
        });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  // verifique se o usuário que está assinando é um dos membros do vault
  // verifique se o usuário já assinou
  // verifique se o usuário já rejeitou

  async signByID({
    body: { signature, approve },
    params: { hash: txHash },
    user: { address: account, id: userId },
  }: ISignByIdRequest) {
    try {
      const transaction = await Transaction.findOne({
        where: { hash: txHash },
      });
      const isValidSignature = this.transactionService.validateSignature(
        transaction,
        account,
      );

      if (!transaction) {
        return successful(false, Responses.Ok);
      }

      const witness = {
        ...transaction.resume.witnesses.find(w => w.account === account),
        signature: isValidSignature ? signature : null,
        status:
          approve && isValidSignature ? WitnessStatus.DONE : WitnessStatus.REJECTED,
      };

      transaction.resume.witnesses = transaction.resume.witnesses.map(w =>
        w.account === account ? witness : w,
      );
      const newStatus = this.transactionService.validateStatus(
        transaction,
        transaction.resume.witnesses,
      );

      transaction.resume.status = newStatus;
      transaction.status = newStatus;

      await transaction.save();

      if (newStatus === TransactionStatus.PENDING_SENDER) {
        await this.transactionService.sendToChain(transaction.hash);
      }

      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

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
        id,
        type,
      } = req.query;
      const { workspace, user } = req;

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

      const response = await new TransactionService()
        .filter({
          id,
          to,
          status: status ?? undefined,
          createdBy,
          name,
          workspaceId: _wk,
          signer: hasSingle ? user.address : undefined,
          predicateId: predicateId ?? undefined,
          type,
        })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async listWithIncomings(req: IListWithIncomingsRequest) {
    try {
      const {
        status,
        orderBy,
        sort,
        predicateId,
        type,
        perPage,
        offsetDb,
        offsetFuel,
        id,
      } = req.query;
      const { workspace, user } = req;

      if (id) {
        return successful(await this.transactionService.findById(id), Responses.Ok);
      }

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

      const _status = status ?? undefined;
      const signer = hasSingle ? user.address : undefined;
      const ordination = { orderBy, sort };

      const dbTxs = await new TransactionService()
        .filter({
          status: _status,
          workspaceId: _wk,
          signer,
          predicateId: predicateId ?? undefined,
          type,
          id,
        })
        .ordination(ordination)
        .transactionPaginate({
          perPage,
          offsetDb: offsetDb,
          offsetFuel: offsetFuel,
        })
        .listWithIncomings();

      let fuelTxs = [];

      if (
        _wk.length > 0 &&
        (!_status ||
          _status?.some(status => status === TransactionStatus.SUCCESS)) &&
        (!type || type === TransactionType.DEPOSIT)
      ) {
        const predicates = await this.predicateService
          .filter({
            workspace: _wk,
            signer,
            ids: predicateId,
          })
          .list()
          .then((data: Predicate[]) => data);

        fuelTxs = await this.transactionService
          .transactionPaginate({
            perPage,
            offsetDb: offsetDb,
            offsetFuel: offsetFuel,
          })
          .fetchFuelTransactions(predicates);
      }

      const mergedList = mergeTransactionLists(dbTxs, fuelTxs, {
        ordination,
        perPage,
        offsetDb,
        offsetFuel,
      });

      const response = mergedList;

      return successful(response, Responses.Ok);
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

  async send(params: ISendTransactionRequest) {
    const {
      params: { hash },
    } = params;
    try {
      await this.transactionService.sendToChain(hash.slice(2)); // not wait for this
      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

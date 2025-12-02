import { Workspace } from '@src/models/Workspace';
import { TransactionStatus, TransactionType, WitnessStatus } from 'bakosafe';
import { isUUID } from 'class-validator';

import { NotificationTitle, Predicate, Transaction, User } from '@models/index';

import { IPredicateService } from '@modules/predicate/types';

import { BadRequest, error, ErrorTypes } from '@utils/error';
import {
  bindMethods,
  FuelProvider,
  generateWitnessesUpdatedAt,
  Responses,
  successful,
} from '@utils/index';

import {
  Address,
  BN,
  getTransactionSummaryFromRequest,
  transactionRequestify,
} from 'fuels';
import { In, Not } from 'typeorm';
import { IAddressBookService } from '../addressBook/types';
import { NotificationService } from '../notification/services';
import { INotificationService } from '../notification/types';
import App from '@src/server/app';
import { PredicateService } from '../predicate/services';
import { UserService } from '../user/service';
import { WorkspaceService } from '../workspace/services';
import { TransactionService } from './services';
import {
  ICancelTransactionRequest,
  ICloseTransactionRequest,
  ICreateTransactionHistoryRequest,
  ICreateTransactionRequest,
  IDeleteTransactionByHashRequest,
  IFindTransactionByHashRequest,
  IFindTransactionByIdRequest,
  IListRequest,
  IListWithIncomingsRequest,
  ISendTransactionRequest,
  ISignByIdRequest,
  ITransactionHistory,
  ITransactionResponse,
  ITransactionService,
  TransactionHistory,
} from './types';
import { createTxHistoryEvent, mergeTransactionLists } from './utils';

import { emitTransaction } from '@src/socket/events';
import { SocketEvents, SocketUsernames } from '@src/socket/types';

// todo: use this provider by session, and move to transactions
const { FUEL_PROVIDER } = process.env;

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

  // pending tx
  async pending(req: IListRequest) {
    try {
      const { user, network } = req;
      const { predicateId } = req.query;
      const predicate =
        predicateId && predicateId.length > 0 ? predicateId[0] : undefined;

      // Use chainId for filtering (faster than URL regex, uses index)
      const chainId = String(network.chainId);

      if (!predicate) {
        // Query 1: Get count of pending transactions (fast, no data transfer)
        const countQb = Transaction.createQueryBuilder('t')
          .innerJoin('t.predicate', 'pred')
          .leftJoin('pred.members', 'pm')
          .leftJoin('pred.owner', 'owner')
          .where('(pm.id = :userId OR owner.id = :userId)', { userId: user.id })
          .andWhere('t.status = :status', {
            status: TransactionStatus.AWAIT_REQUIREMENTS,
          })
          .andWhere(`t.network->>'chainId' = :chainId`, { chainId });

        const ofUser = await countQb.getCount();

        // Early return if no pending transactions
        if (ofUser === 0) {
          return successful(
            {
              ofUser: 0,
              transactionsBlocked: false,
              pendingSignature: false,
            },
            Responses.Ok,
          );
        }

        // Query 2: Check if user has pending signature (only fetch resume)
        const pendingSignatureQb = Transaction.createQueryBuilder('t')
          .select(['t.id', 't.resume'])
          .innerJoin('t.predicate', 'pred')
          .leftJoin('pred.members', 'pm')
          .leftJoin('pred.owner', 'owner')
          .where('(pm.id = :userId OR owner.id = :userId)', { userId: user.id })
          .andWhere('t.status = :status', {
            status: TransactionStatus.AWAIT_REQUIREMENTS,
          })
          .andWhere(`t.network->>'chainId' = :chainId`, { chainId });

        const transactions = await pendingSignatureQb.getMany();

        const pendingSignature = transactions.some(tx =>
          tx.resume?.witnesses?.some(
            w => w.account === user.address && !w.signature,
          ),
        );

        return successful(
          {
            ofUser,
            transactionsBlocked: ofUser > 0,
            pendingSignature,
          },
          Responses.Ok,
        );
      }

      // With predicateId filter
      const qb = Transaction.createQueryBuilder('t')
        .select(['t.id', 't.resume'])
        .where('t.status = :status', {
          status: TransactionStatus.AWAIT_REQUIREMENTS,
        })
        .andWhere('t.predicateId = :predicate', { predicate })
        .andWhere(`t.network->>'chainId' = :chainId`, { chainId });

      const transactions = await qb.getMany();

      const ofUser = transactions.length;
      const pendingSignature = transactions.some(tx =>
        tx.resume?.witnesses?.some(w => w.account === user.address && !w.signature),
      );

      return successful(
        {
          ofUser,
          transactionsBlocked: ofUser > 0,
          pendingSignature,
        },
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async create({
    body: transaction,
    user,
    workspace,
    network,
  }: ICreateTransactionRequest) {
    const { predicateAddress, summary, hash } = transaction;

    try {
      const existsTx = await Transaction.findOne({
        where: {
          hash,
          status: Not(
            In([
              TransactionStatus.DECLINED,
              TransactionStatus.FAILED,
              TransactionStatus.CANCELED,
            ]),
          ),
        },
      });

      if (existsTx) {
        return successful(existsTx, Responses.Ok);
      }

      const predicate = await new PredicateService()
        .filter({ address: predicateAddress })
        .list()
        .then((result: Predicate[]) => result[0]);

      // if possible move this next part to a middleware, but we dont have access to body of request
      // ========================================================================================================
      // const hasPermission = validatePermissionGeneral(workspace, user.id, [
      //   PermissionRoles.OWNER,
      //   PermissionRoles.ADMIN,
      //   PermissionRoles.MANAGER,
      // ]);
      // const isMemberOfPredicate = predicate.members.find(
      //   member => member.id === user.id,
      // );

      // if (!isMemberOfPredicate && !hasPermission) {
      //   throw new Unauthorized({
      //     type: ErrorTypes.Unauthorized,
      //     title: UnauthorizedErrorTitles.MISSING_PERMISSION,
      //     detail: 'You do not have permission to access this resource',
      //   });
      // }
      // ========================================================================================================

      const witnesses = predicate.members.map(member => ({
        account: member.address,
        status: WitnessStatus.PENDING,
        signature: null,
        updatedAt: generateWitnessesUpdatedAt(),
      }));

      const config = JSON.parse(predicate.configurable);

      const { operations } = await getTransactionSummaryFromRequest({
        transactionRequest: transactionRequestify(transaction.txData),
        provider: await FuelProvider.create(network.url),
      });
      const newTransaction = await this.transactionService.create({
        ...transaction,
        type: Transaction.getTypeFromTransactionRequest(transaction.txData),
        status: TransactionStatus.AWAIT_REQUIREMENTS,
        resume: {
          hash: transaction.hash,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
          witnesses,
          requiredSigners: config.SIGNATURES_COUNT ?? 1,
          totalSigners: predicate.members.length,
          predicate: {
            id: predicate.id,
            address: predicate.predicateAddress,
          },
          id: '',
        },
        predicate,
        createdBy: user,
        summary: summary ?? {
          type: 'cli',
          operations: operations.map(o => ({
            ...o,
            assetsSent: o.assetsSent?.map(a => ({
              ...a,
              amount: new BN(a.amount).toHex(),
            })),
          })),
        },
        network,
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
          network,
        });

        await new NotificationService().transactionUpdate(newTransaction.id);

        const transactionHistory = await TransactionController.formatTransactionsHistory(
          newTransaction,
        );

        emitTransaction(member.id, {
          sessionId: member.id,
          to: SocketUsernames.UI,
          type: SocketEvents.TRANSACTION_CREATED,
          transaction: newTransaction,
          history: transactionHistory as ITransactionHistory[],
        });
      }

      return successful(newTransaction, Responses.Created);
    } catch (e) {
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
        // const predicate = await this.predicateService.findById(predicateId);
        result = await this.transactionService.findById(id);
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
    const events = [
      createTxHistoryEvent(
        TransactionHistory.CREATED,
        data.createdAt,
        data.createdBy,
      ),
    ];

    const _witnesses = data.resume.witnesses.filter(
      witness =>
        witness.status === WitnessStatus.DONE ||
        witness.status === WitnessStatus.REJECTED ||
        witness.status === WitnessStatus.CANCELED,
    );

    // Batch fetch all users at once instead of N individual queries
    const witnessAddresses = _witnesses.map(w => w.account);
    const users =
      witnessAddresses.length > 0
        ? await User.find({ where: { address: In(witnessAddresses) } })
        : [];
    const userMap = new Map(users.map(u => [u.address, u]));

    const witnessEventMap = {
      [WitnessStatus.DONE]: TransactionHistory.SIGN,
      [WitnessStatus.REJECTED]: TransactionHistory.DECLINE,
      [WitnessStatus.CANCELED]: TransactionHistory.CANCEL,
    };

    // Use pre-fetched users from map (O(1) lookup instead of DB call)
    const witnessEvents = _witnesses.map(witness => {
      const user = userMap.get(witness.account);
      const eventType = witnessEventMap[witness.status];
      return createTxHistoryEvent(eventType, witness.updatedAt, user);
    });

    events.push(...witnessEvents);

    switch (data.status) {
      case TransactionStatus.SUCCESS:
        events.push(
          createTxHistoryEvent(
            TransactionHistory.SEND,
            data.sendTime,
            data.createdBy,
          ),
        );
        break;

      case TransactionStatus.FAILED:
        events.push(
          createTxHistoryEvent(
            TransactionHistory.FAILED,
            data.updatedAt,
            data.createdBy,
          ),
        );
        break;

      default:
        break;
    }

    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
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

  async findByHash({
    params: { hash },
    query: { status },
    network,
  }: IFindTransactionByHashRequest) {
    try {
      const response = await this.transactionService
        .filter({
          hash: hash.slice(2),
          network: network.url,
          status: status ?? undefined,
        })
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
    user,
    network,
  }: ISignByIdRequest) {
    const { address: account } = user;

    try {
      const transaction = await Transaction.findOne({
        where: {
          hash: txHash.startsWith(`0x`) ? txHash.slice(2) : txHash,
          status: Not(
            In([
              TransactionStatus.DECLINED,
              TransactionStatus.FAILED,
              TransactionStatus.CANCELED,
              TransactionStatus.SUCCESS,
            ]),
          ),
        },
        relations: ['predicate', 'predicate.members', 'createdBy'],
      });

      if (!transaction) {
        return successful(false, Responses.Ok);
      }

      const isValidSignature = this.transactionService.validateSignature(
        transaction,
        account,
      );

      const witness = {
        ...transaction.resume.witnesses.find(w => w.account === account),
        signature: isValidSignature ? signature : null,
        status:
          approve && isValidSignature ? WitnessStatus.DONE : WitnessStatus.REJECTED,
        updatedAt: generateWitnessesUpdatedAt(),
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
        await this.transactionService.sendToChain(transaction.hash, network);
      }

      await new NotificationService().transactionUpdate(transaction.id);

      const predicate = await this.predicateService.findByAddress(
        transaction.predicate.predicateAddress,
      );

      const signedTransaction = Transaction.formatTransactionResponse(transaction);

      const transactionHistory = await TransactionController.formatTransactionsHistory(
        transaction,
      );

      for (const member of predicate.members) {
        emitTransaction(member.id, {
          sessionId: member.id,
          to: SocketUsernames.UI,
          type: SocketEvents.TRANSACTION_UPDATED,
          transaction: signedTransaction,
          history: transactionHistory as ITransactionHistory[],
        });
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
      const { workspace, user, network } = req;

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
          network: network.url,
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
      const { workspace, user, network } = req;

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
          network: network.url,
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
          // todo: use this provider by session
          .fetchFuelTransactions(predicates, network.url || FUEL_PROVIDER);
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

  async cancel(req: ICancelTransactionRequest) {
    const { user } = req;
    const { hash } = req.params;

    try {
      let transaction = await Transaction.findOne({
        where: {
          hash,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
        },
        relations: ['predicate', 'predicate.members', 'createdBy'],
      });

      if (!transaction) {
        throw new BadRequest({
          type: ErrorTypes.NotFound,
          title: 'Failed to cancel transaction',
          detail: `Transaction with hash ${hash} not found`,
        });
      }

      // Set transaction status to canceled
      transaction.status = TransactionStatus.CANCELED;
      transaction.resume.status = TransactionStatus.CANCELED;

      // Find user signature or create a new one
      const userSignature = transaction.resume.witnesses.find(witness =>
        Address.fromB256(witness.account).equals(Address.fromB256(user.address)),
      ) || {
        status: WitnessStatus.CANCELED,
        signature: null,
        updatedAt: '',
        account: user.address,
      };

      // Update user signature status and save transaction
      userSignature.status = WitnessStatus.CANCELED;
      userSignature.updatedAt = generateWitnessesUpdatedAt();
      transaction.resume.witnesses = transaction.resume.witnesses.map(witness =>
        witness.account === userSignature.account ? userSignature : witness,
      );
      transaction = await transaction.save();

      const predicate = await this.predicateService.findByAddress(
        transaction.predicate.predicateAddress,
      );

      const canceledTransaction = Transaction.formatTransactionResponse(
        transaction,
      );

      const transactionHistory = await TransactionController.formatTransactionsHistory(
        transaction,
      );

      for (const member of predicate.members) {
        emitTransaction(member.id, {
          sessionId: member.id,
          to: SocketUsernames.UI,
          type: SocketEvents.TRANSACTION_CANCELED,
          transaction: canceledTransaction,
          history: transactionHistory as ITransactionHistory[],
        });
      }

      return successful(transaction.resume, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async close({
    body: { gasUsed, transactionResult },
    params: { id },
  }: ICloseTransactionRequest) {
    try {
      // Get transaction with predicate to invalidate cache
      const transaction = await Transaction.findOne({
        where: { id },
        relations: ['predicate'],
      });

      const response = await this.transactionService.update(id, {
        status: TransactionStatus.SUCCESS,
        sendTime: new Date(),
        gasUsed,
        resume: transactionResult,
      });

      // Invalidate caches after closing transaction (granular by chainId)
      if (transaction?.predicate?.predicateAddress) {
        this.invalidatePredicateCaches(
          transaction.predicate.predicateAddress,
          transaction.network?.chainId,
        ).catch(err =>
          console.error('[TX_CLOSE] Failed to invalidate caches:', err),
        );
      }

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  /**
   * Invalidate all caches for a predicate
   *
   * @param predicateAddress - The predicate address to invalidate
   * @param chainId - Optional chainId for granular invalidation (only invalidates that specific chain)
   */
  private async invalidatePredicateCaches(
    predicateAddress: string,
    chainId?: number,
  ): Promise<void> {
    const chainInfo = chainId ? ` chain:${chainId}` : ' all chains';
    const addrShort = predicateAddress?.slice(0, 12);

    try {
      // Invalidate balance cache
      const balanceCache = App.getInstance()._balanceCache;
      await balanceCache.invalidate(predicateAddress, chainId);

      // Invalidate transaction cache
      const transactionCache = App.getInstance()._transactionCache;
      await transactionCache.invalidate(predicateAddress, chainId);

      console.log(`[TX_CACHE] Caches invalidated for ${addrShort}...${chainInfo}`);
    } catch (error) {
      console.error('[TX_CACHE] Failed to invalidate caches:', error);
    }
  }

  async send(params: ISendTransactionRequest) {
    const {
      params: { hash },
    } = params;
    try {
      await this.transactionService.sendToChain(hash.slice(2), params.network); // not wait for this
      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async listAll(req: IListRequest) {
    try {
      const { page, perPage } = req.query;
      const response = await this.transactionService
        .paginate({ page: page || '0', perPage: perPage || '30' })
        .listAll();
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findAdvancedDetails(req: IFindTransactionByIdRequest) {
    try {
      const { id } = req.params;
      const response = await this.transactionService.findAdvancedDetailById(id);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async deleteByHash(req: IDeleteTransactionByHashRequest) {
    try {
      const { hash } = req.params;
      const response = await this.transactionService.deleteByHash(
        hash.startsWith(`0x`) ? hash.slice(2) : hash,
      );
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

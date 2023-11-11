import { ok } from 'assert';

import AddressBook from '@src/models/AddressBook';
import { IPagination } from '@src/utils/pagination';

import {
  Asset,
  Predicate,
  Transaction,
  TransactionStatus,
  User,
  WitnessesStatus,
} from '@models/index';

import { IPredicateService } from '@modules/predicate/types';
import { IWitnessService } from '@modules/witness/types';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IAddressBookService } from '../addressBook/types';
import {
  ICloseTransactionRequest,
  ICreateTransactionRequest,
  IFindTransactionByHashRequest,
  IFindTransactionByIdRequest,
  IListRequest,
  ISignByIdRequest,
  ITransactionService,
} from './types';

export class TransactionController {
  private transactionService: ITransactionService;
  private predicateService: IPredicateService;
  private witnessService: IWitnessService;
  private addressBookService: IAddressBookService;

  constructor(
    transactionService: ITransactionService,
    predicateService: IPredicateService,
    witnessService: IWitnessService,
    addressBookService: IAddressBookService,
  ) {
    Object.assign(this, {
      transactionService,
      predicateService,
      witnessService,
      addressBookService,
    });
    bindMethods(this);
  }

  async create({ body: transaction, user }: ICreateTransactionRequest) {
    try {
      const predicate = await this.predicateService
        .filter({
          address: transaction.predicateAdress,
        })
        .list();

      const newTransaction = await this.transactionService.create({
        ...transaction,
        assets: transaction.assets.map(asset => Asset.create(asset)),
        status: TransactionStatus.AWAIT,
        predicateID: predicate[0].id,
        createdBy: user,
      });

      const witnesses = predicate[0].members.map((member: User) => ({
        account: member.address,
        transactionID: newTransaction.id,
      }));

      for await (const witness of witnesses) {
        await this.witnessService.create(witness);
      }

      return successful(newTransaction, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findById({ params: { id } }: IFindTransactionByIdRequest) {
    try {
      const response = await this.transactionService.findById(id);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findByHash({ params: { hash } }: IFindTransactionByHashRequest) {
    try {
      const response = await this.transactionService.filter({ hash }).list();
      return successful(response[0], Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async signByID({
    body: { account, signer, confirm },
    params: { id },
  }: ISignByIdRequest) {
    try {
      const transaction = await this.transactionService.findById(id);

      const witness = transaction.witnesses.find(w => w.account === account);

      if (transaction && witness) {
        await this.witnessService.update(witness.id, {
          signature: signer,
          status: confirm ? WitnessesStatus.DONE : WitnessesStatus.REJECTED,
        });

        await this.transactionService.update(id, {
          status: await this.transactionService.validateStatus(id),
        });

        return successful(true, Responses.Ok);
      }
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async list(req: IListRequest) {
    const {
      predicateId,
      to,
      status,
      orderBy,
      sort,
      page,
      perPage,
      limit,
      endDate,
      startDate,
      createdBy,
      name,
      allOfUser,
    } = req.query;
    const { user } = req;
    const _predicateId =
      typeof predicateId == 'string' ? [predicateId] : predicateId;
    const hasPagination = !!page && !!perPage;

    try {
      const predicateIds: string[] = allOfUser
        ? await this.predicateService
            .filter({ signer: user.address })
            .list()
            .then((data: Predicate[]) => {
              return data.map(predicate => predicate.id);
            })
        : predicateId
        ? _predicateId
        : undefined;

      if (predicateIds && predicateIds.length === 0)
        return successful([], Responses.Ok);

      let response = await this.transactionService
        .filter({
          predicateId: predicateIds,
          to,
          status,
          endDate,
          startDate,
          createdBy,
          name,
          limit,
        })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      let data = hasPagination
        ? (response as IPagination<Transaction>).data
        : (response as Transaction[]);

      const assets = data.map(i => i.assets);
      const recipientAddresses = assets.flat().map(i => i.to);
      const favorites = (await this.addressBookService
        .filter({ createdBy: user.id, contactAddresses: recipientAddresses })
        .list()) as AddressBook[];

      if (favorites.length > 0) {
        data = (data.map(transaction => ({
          ...transaction,
          assets: transaction.assets.map(asset => ({
            ...asset,
            recipientNickname:
              favorites?.find(favorite => favorite.user.address === asset.to)
                ?.nickname ?? undefined,
          })),
        })) as unknown) as Transaction[];
      }

      response = hasPagination ? { ...response, data } : data;

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async close({
    body: { gasUsed, transactionResult, hasError },
    params: { id },
  }: ICloseTransactionRequest) {
    try {
      const response = await this.transactionService.update(id, {
        status: hasError ? TransactionStatus.ERROR : TransactionStatus.DONE,
        sendTime: new Date(),
        gasUsed,
        resume: transactionResult,
      });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

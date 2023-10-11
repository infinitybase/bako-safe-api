import {
  Asset,
  Predicate,
  TransactionStatus,
  WitnessesStatus,
} from '@models/index';

import { IPredicateService } from '@modules/predicate/types';
import { IWitnessService } from '@modules/witness/types';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

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

  constructor(
    transactionService: ITransactionService,
    predicateService: IPredicateService,
    witnessService: IWitnessService,
  ) {
    Object.assign(this, { transactionService, predicateService, witnessService });
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

      const witnesses = ((predicate[0].addresses as unknown) as string[]).map(
        (address: string) => ({
          account: address,
          transactionID: newTransaction.id,
        }),
      );

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
      endDate,
      startDate,
      createdBy,
      name,
      allOfUser,
    } = req.query;
    const { user } = req;
    const _predicateId =
      typeof predicateId == 'string' ? [predicateId] : predicateId;
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

      const response = await this.transactionService
        .filter({
          predicateId: predicateIds,
          to,
          status,
          endDate,
          startDate,
          createdBy,
          name,
        })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

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
        status: TransactionStatus.DONE,
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

import { Predicate, Transaction, TransactionStatus } from '@models/index';

import { IPredicateService } from '@modules/predicate/types';
import { IWitnessService } from '@modules/witness/types';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IAssetService } from '../asset/types';
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
  private assetService: IAssetService;

  constructor(
    transactionService: ITransactionService,
    predicateService: IPredicateService,
    witnessService: IWitnessService,
    assetService: IAssetService,
  ) {
    Object.assign(this, {
      transactionService,
      predicateService,
      witnessService,
      assetService,
    });
    bindMethods(this);
  }

  async create({ body: transaction }: ICreateTransactionRequest) {
    try {
      const predicate = await this.predicateService
        .filter({
          address: transaction.predicateAddress,
        })
        .list()
        .then((result: Predicate[]) => result[0]);

      const newTransaction = await this.transactionService.create({
        ...transaction,
        status: TransactionStatus.AWAIT_REQUIREMENTS,
        predicateID: predicate.id,
      });

      for await (const witnesses of predicate.addresses) {
        await this.witnessService.create({
          transactionID: newTransaction.id,
          account: witnesses,
        });
      }

      for await (const asset of transaction.assets) {
        await this.assetService.create({
          ...asset,
          transactionID: newTransaction.id,
        });
      }

      return successful(newTransaction, Responses.Ok);
    } catch (e) {
      console.log(e);
      return error(e.error, e.statusCode);
    }
  }

  async findById({ params: { id } }: IFindTransactionByIdRequest) {
    try {
      const response = await this.transactionService.findById(id);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByHash({ params: { hash } }: IFindTransactionByHashRequest) {
    try {
      const response = await this.transactionService
        .filter({ hash })
        .list()
        .then((result: Transaction[]) => {
          result[0];
        });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async signByID({ body: { account, signer }, params: { id } }: ISignByIdRequest) {
    try {
      const transaction = await this.transactionService.findById(id);
      const witness = transaction.witnesses.find(w => w.account === account);

      if (transaction && witness) {
        await this.witnessService.update(witness.id, { signature: signer });

        const statusField =
          Number(transaction.predicate.minSigners) <=
          transaction.witnesses.length + 1
            ? TransactionStatus.PENDING_SENDER
            : TransactionStatus.AWAIT_REQUIREMENTS;

        await this.transactionService.update(id, {
          status: statusField,
        });

        return successful(true, Responses.Ok);
      }
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list(req: IListRequest) {
    const { predicateId, to, orderBy, sort, page, perPage } = req.query;

    try {
      const response = await this.transactionService
        .filter({ predicateId, to })
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
      return error(e.error, e.statusCode);
    }
  }
}

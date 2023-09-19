import { error } from '@utils/error';
import { Responses, successful, bindMethods } from '@utils/index';

import { IPredicateService } from '../predicate/types';
import { IWitnessService } from '../witness/types';
import {
  ICreateTransactionRequest,
  IFindTransactionByIdRequest,
  ISignByIdRequest,
  ITransactionService,
  TransactionStatus,
  IListRequest,
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
    this.transactionService = transactionService;
    this.predicateService = predicateService;
    this.witnessService = witnessService;

    bindMethods(this);
  }

  async create({ body: transaction }: ICreateTransactionRequest) {
    try {
      const newTransaction = await this.transactionService.create({
        ...transaction,
        status: TransactionStatus.AWAIT,
      });

      const predicate = await this.predicateService.findById(
        newTransaction.predicateID,
      );

      const witnesses = ((predicate.addresses as unknown) as string[]).map(
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
      return error(e.error[0], e.statusCode);
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

  async signByID({ body: { account, signer }, params: { id } }: ISignByIdRequest) {
    try {
      const transaction = await this.transactionService.findById(id);
      const witness = transaction.witnesses.find(w => w.account === account);

      if (transaction && witness) {
        await this.witnessService.update(witness.id, { signature: signer });

        const statusField =
          Number(transaction.predicate.minSigners) <=
          transaction.witnesses.length + 1
            ? TransactionStatus.PENDING
            : TransactionStatus.AWAIT;

        const updatedTransaction = await this.transactionService.update(id, {
          status: statusField,
        });

        return successful(updatedTransaction, Responses.Ok);
      }
    } catch (e) {
      return error(e.error[0], e.statusCode);
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
}

import { error } from '@utils/error';
import { Responses, successful, bindMethods } from '@utils/index';

import {
  IAddTransactionRequest,
  ICloseTransactionRequest,
  IFindTransactionByIdRequest,
  IFindTransactionByPredicateIdRequest,
  IFindTransactionByToRequest,
  ISignerByIdRequest,
  ITransactionService,
} from './types';

export class TransactionController {
  private transactionService: ITransactionService;

  constructor(transactionService: ITransactionService) {
    this.transactionService = transactionService;
    bindMethods(this);
  }

  async add({ body: transaction }: IAddTransactionRequest) {
    try {
      const response = await this.transactionService.add({
        ...transaction,
        status: 'AWAIT',
      });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findAll() {
    try {
      const response = await this.transactionService
        .ordination()
        .paginate()
        .findAll();
      return successful(response, Responses.Ok);
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

  async findByPredicateId({
    params: { predicateId },
  }: IFindTransactionByPredicateIdRequest) {
    try {
      const response = await this.transactionService
        .ordination()
        .paginate()
        .findByPredicateId(predicateId);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findByTo({ params: { to } }: IFindTransactionByToRequest) {
    try {
      const response = await this.transactionService
        .ordination()
        .paginate()
        .findByTo(to);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async close({
    body: { gasUsed, transactionResult },
    params: { id },
  }: ICloseTransactionRequest) {
    try {
      const response = await this.transactionService.close(id, {
        status: 'DONE',
        sendTime: new Date(),
        gasUsed,
        resume: transactionResult,
      });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async signerByID({
    body: { account, signer },
    params: { id },
  }: ISignerByIdRequest) {
    try {
      const response = await this.transactionService.signerByID(id, {
        account,
        signer,
      });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

import { error } from '@utils/error';
import { Responses, successful, bindMethods } from '@utils/index';

import {
  IAddTransactionRequest,
  ICloseTransactionRequest,
  IFindTransactionByIdRequest,
  IFindTransactionByPredicateIdRequest,
  IFindTransactionByToRequest,
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
      const response = await this.transactionService.findAll();
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findById({ params: { id } }: IFindTransactionByIdRequest) {
    try {
      const response = await this.transactionService.findById(Number(id));
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findByPredicateId({
    params: { predicateId },
  }: IFindTransactionByPredicateIdRequest) {
    try {
      const response = await this.transactionService.findByPredicateId(
        Number(predicateId),
      );
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findByTo({ params: { to } }: IFindTransactionByToRequest) {
    try {
      const response = await this.transactionService.findByTo(to);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async close({ body: transaction, params: { id } }: ICloseTransactionRequest) {
    try {
      const response = await this.transactionService.close(Number(id), {
        ...transaction,
        status: 'DONE',
        sendTime: new Date(),
      });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  // async findByAddresses({ params: { addresses } }: IFindByAdressesRequest) {
  //   try {
  //     const response = await this.predicateService.findByAdresses(addresses);
  //     return successful(response, Responses.Ok);
  //   } catch (e) {
  //     return error(e.error[0], e.statusCode);
  //   }
  // }
}

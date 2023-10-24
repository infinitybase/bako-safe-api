import { Predicate } from '@src/models/Predicate';

import { Asset, Transaction, TransactionStatus } from '@models/index';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { ITransactionService } from '../transaction/types';
import {
  ICreatePredicateRequest,
  IDeletePredicateRequest,
  IFindByHashRequest,
  IFindByIdRequest,
  IListRequest,
  IPredicateService,
} from './types';

export class PredicateController {
  private predicateService: IPredicateService;
  private transactionService: ITransactionService;

  constructor(
    predicateService: IPredicateService,
    transactionService: ITransactionService,
  ) {
    this.predicateService = predicateService;
    this.transactionService = transactionService;
    bindMethods(this);
  }

  async create({ body: payload }: ICreatePredicateRequest) {
    try {
      const { predicateAddress } = payload;
      const response = await this.predicateService
        .filter({
          address: predicateAddress,
        })
        .list()
        .then(async (result: Predicate[]) => {
          if (result.length > 0) {
            return result[0];
          }

          return await this.predicateService.create(payload);
        });

      return successful(response, Responses.Ok);
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

  async findById({ params: { id } }: IFindByIdRequest) {
    try {
      const response = await this.predicateService.findById(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByAddress({ params: { address } }: IFindByHashRequest) {
    try {
      const response = await this.predicateService
        .filter({
          address,
        })
        .list()
        .then((data: Predicate[]) => data[0]);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async hasReservedCoins({ params: { address } }: IFindByHashRequest) {
    try {
      const response = await this.transactionService
        .filter({
          predicateAddress: address,
        })
        .list()
        .then((data: Transaction[]) => {
          const a: string[] = [];
          data
            .filter(
              (transaction: Transaction) =>
                transaction.status == TransactionStatus.AWAIT_REQUIREMENTS ||
                transaction.status == TransactionStatus.PENDING_SENDER,
            )
            .map((_filteredTransactions: Transaction) => {
              _filteredTransactions.assets.map((_assets: Asset) =>
                a.push(_assets.utxo),
              );
            });
          return a;
        })
        .catch(() => {
          return [];
        });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list(req: IListRequest) {
    const { provider, owner, orderBy, sort, page, perPage, q } = req.query;
    const { address } = req.user;

    try {
      const response = await this.predicateService
        .filter({ address, signer: address, provider, owner, q })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

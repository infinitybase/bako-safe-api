
import { IConfVault, Vault } from 'bsafe';
import {
  Provider,
  TransactionResponse,
  hexlify,
  transactionRequestify,
} from 'fuels';

import { Predicate, Transaction, TransactionStatus } from '@models/index';


import { IPredicateService } from '@modules/predicate/types';
import { IWitnessService } from '@modules/witness/types';

import { ErrorTypes, NotFound, error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IAssetService } from '../asset/types';
import {
  ICloseTransactionRequest,
  ICreateTransactionRequest,
  IFindTransactionByHashRequest,
  IFindTransactionByIdRequest,
  IListRequest,
  ISendTransactionRequest,
  ISignByIdRequest,
  ITransactionService,
  IUpdateTransactionPayload,
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

  async create({ body: transaction, user }: ICreateTransactionRequest) {
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
        resume: JSON.stringify({
          witnesses: [],
          outputs: transaction.assets,
        }),
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

  async signByID({
    body: { account, signer, confirm },
    params: { id },
  }: ISignByIdRequest) {
    try {
      const transaction = await this.transactionService.findById(id);
      const { predicate, witnesses, resume } = transaction;
      const _resume = JSON.parse(resume);

      const witness = witnesses.find(w => w.account === account);

      if (witness) {
        await this.witnessService.update(witness.id, {
          signature: signer,
        });

        _resume.witnesses.push(signer);

        const signatures = await this.witnessService.findByTransactionId(
          transaction.id,
          true,
        );

        const statusField =
          Number(predicate.minSigners) <= signatures.length
            ? TransactionStatus.PENDING_SENDER
            : TransactionStatus.AWAIT_REQUIREMENTS;

        await this.transactionService.update(id, {
          status: statusField,
          resume: JSON.stringify({
            ..._resume,
            status: statusField,
          }),
        });
      }

      return successful(!!witness, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
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
          limit,
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
    body: { gasUsed, transactionResult, hasError },
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
      const api_transaction = await this.transactionService.findById(id);
      const api_predicate = await this.predicateService.findById(
        api_transaction.predicateID,
      );

      const invalidConditions =
        !api_transaction ||
        api_transaction.status === TransactionStatus.AWAIT_REQUIREMENTS ||
        api_transaction.status === TransactionStatus.SUCCESS;

      if (invalidConditions) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Error on transaction list',
          detail: 'No transactions found with the provided params',
        });
      }
      const api_configurable: IConfVault = JSON.parse(api_predicate.configurable);

      const sdk_predicate = new Vault({
        configurable: {
          ...api_configurable,
        },
        abi: api_predicate.abi,
        bytecode: api_predicate.bytes,
      });

      const sdk_transaction = await sdk_predicate.BSAFEIncludeTransaction(
        api_transaction.id,
      );

      const provider = new Provider(api_configurable.network);
      const _transaction = transactionRequestify(sdk_transaction);
      const tx_est = await provider.estimatePredicates(_transaction);

      const encodedTransaction = hexlify(tx_est.toTransactionBytes());

      const {
        submit: { id: transactionId },
      } = await provider.operations.submit({ encodedTransaction });

      const sender = new TransactionResponse(transactionId, provider);

      const result = await sender.waitForResult();

      const { witnesses } = result.transaction;

      const resume = {
        ...JSON.parse(api_transaction.resume),
        block: result.blockId,
        witnesses: witnesses.map(witness => witness.data),
        bsafeID: api_transaction.id,
        fee: result.fee.format(),
        gasUsed: result.gasUsed.format(),
        status: result.status,
      };

      const _api_transaction: IUpdateTransactionPayload = {
        status:
          result.status === 'success'
            ? TransactionStatus.SUCCESS
            : TransactionStatus.FAILED,
        sendTime: new Date(),
        gasUsed: result.gasUsed.format(),
        resume: JSON.stringify(resume),
      };

      await this.transactionService.update(api_transaction.id, _api_transaction);
      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

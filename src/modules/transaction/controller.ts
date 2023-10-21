import {
  Provider,
  TransactionRequest,
  TransactionResponse,
  hexlify,
  transactionRequestify,
} from 'fuels';

import {
  Predicate,
  Transaction,
  TransactionProcessStatus,
  TransactionStatus,
  WitnessesStatus,
} from '@models/index';

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
          status: confirm ? WitnessesStatus.DONE : WitnessesStatus.REJECTED,
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
      const { predicate } = api_transaction;
      const sdk_predicate = await this.predicateService.instancePredicate(
        api_transaction.predicateID,
      );

      const provider = new Provider(predicate.provider);

      const bsafe_transaction = await this.transactionService.instanceTransactionScript(
        api_transaction,
        sdk_predicate,
      );

      this.transactionService.checkInvalidConditions(api_transaction);

      const transactionId = await this.transactionService.sendToChain(
        bsafe_transaction,
        provider,
      );

      const resume = {
        ...JSON.parse(api_transaction.resume),
        witnesses: bsafe_transaction.BSAFEScript.witnesses.map(witness => witness),
        bsafeID: api_transaction.id,
      };
      const _api_transaction: IUpdateTransactionPayload = {
        status: TransactionStatus.PROCESS_ON_CHAIN,
        sendTime: new Date(),
        resume: JSON.stringify(resume),
        idOnChain: transactionId,
      };
      await this.transactionService.update(api_transaction.id, _api_transaction);
      return successful(resume, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async verifyOnChain({ params: { id } }: ISendTransactionRequest) {
    try {
      const api_transaction = await this.transactionService.findById(id);
      const { predicate } = api_transaction;
      const provider = new Provider(predicate.provider);

      this.transactionService.checkInvalidConditions(api_transaction);

      const result = this.transactionService.verifyOnChain(
        api_transaction,
        provider,
      );
      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

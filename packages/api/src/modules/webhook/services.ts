import { networksByChainId } from '@src/constants/networks';
import {
  Predicate,
  Transaction,
  TransactionStatus,
  TransactionStatusWithRamp,
  TransactionTypeWithRamp,
} from '@src/models';
import { RampTransaction } from '@src/models/RampTransactions';
import { emitTransaction } from '@src/socket/events';
import { SocketEvents, SocketUsernames } from '@src/socket/types';
import { FuelProvider } from '@src/utils';
import { ErrorTypes, Internal, NotFound } from '@src/utils/error';
import { getTransactionSummary } from 'fuels';
import { IMeldTransactionCryptoWeebhook } from '../meld/types';
import { MeldApi, MeldApiFactory, MOCK_DEPOSIT_TX_ID } from '../meld/utils';
import { TransactionController } from '../transaction/controller';
import {
  ICreateTransactionPayload,
  ITransactionHistory,
} from '../transaction/types';
import { getTransactionStatusByPaymentStatus } from './utils';

export default class WebhookService {
  async handleMeldCryptoWebhook(data: IMeldTransactionCryptoWeebhook) {
    const externalSessionId = data.payload.externalSessionId;

    if (externalSessionId) {
      const meldData = await RampTransaction.createQueryBuilder('ramp')
        .where(
          `ramp.provider_data::jsonb -> 'widgetSessionData' ->> 'externalSessionId' = :sessionId`,
          { sessionId: externalSessionId },
        )
        .leftJoin('ramp.transaction', 'transaction')
        .leftJoin('ramp.user', 'user')
        .addSelect(['transaction.id', 'user.id'])
        .getOne();

      if (!meldData) {
        throw new NotFound({
          title: 'Meld transaction not found',
          detail: `Transaction with external session ID ${externalSessionId} not found.`,
          type: ErrorTypes.NotFound,
        });
      }
      const isSandbox = meldData.isSandbox;
      const meldEnviroment = MeldApiFactory.getMeldEnviroment(
        isSandbox ? 'sandbox' : 'production',
      );
      const meldApi = new MeldApi(meldEnviroment.baseUrl, meldEnviroment.apiKey);
      const meldTransactions = await meldApi.getMeldTransactions({
        externalSessionIds: externalSessionId,
      });
      const blockchainTransactionId = isSandbox
        ? MOCK_DEPOSIT_TX_ID
        : meldTransactions?.transactions?.[0]?.cryptoDetails
            ?.blockchainTransactionId;

      if (!meldData.transaction && blockchainTransactionId) {
        const destinationAddress = meldData.userWalletAddress;
        const chainId = meldTransactions?.transactions?.[0]?.cryptoDetails?.chainId;
        const networkUrl = isSandbox
          ? networksByChainId[0]
          : networksByChainId[chainId] || networksByChainId['9889'];
        const provider = await FuelProvider.create(networkUrl);
        const txSummary = await getTransactionSummary({
          provider,
          id: blockchainTransactionId,
        });
        const predicate = await Predicate.findOneOrFail({
          where: { predicateAddress: destinationAddress },
          relations: { members: true },
        });
        const meldEthValue = isSandbox ? 'ETH' : 'ETH_FUEL';

        const config = JSON.parse(predicate.configurable);
        const meldTxData = meldTransactions.transactions[0];
        const isOnRamp = meldTxData.destinationCurrencyCode === meldEthValue;

        const newTransaction: ICreateTransactionPayload = {
          type: isOnRamp
            ? TransactionTypeWithRamp.ON_RAMP_DEPOSIT
            : TransactionTypeWithRamp.OFF_RAMP_WITHDRAW,
          status: TransactionStatusWithRamp.PENDING_PROVIDER,
          gasUsed: txSummary.gasUsed.format(),
          createdBy: meldData.user,
          hash: txSummary.id.slice(2),
          name: isOnRamp ? 'On Ramp' : 'Off Ramp',
          resume: {
            hash: txSummary.id,
            status: TransactionStatus.SUCCESS,
            witnesses: [],
            requiredSigners: config.SIGNATURES_COUNT ?? 1,
            totalSigners: predicate.members.length,
            predicate: {
              id: predicate.id,
              address: predicate.predicateAddress,
            },
            id: txSummary.id,
          },
          txData: {
            gasPrice: txSummary.transaction.gasPrice,
            scriptGasLimit: txSummary.transaction.scriptGasLimit,
            // @ts-expect-error - is script
            script: txSummary.transaction.script,
            // @ts-expect-error - is scriptData
            scriptData: txSummary.transaction.scriptData,
            // @ts-expect-error - is type
            type: txSummary.transaction.type,
            // @ts-expect-error - is witnesses
            witnesses: txSummary.transaction.witnesses,
            outputs: txSummary.transaction.outputs,
            // @ts-expect-error - is inputs
            inputs: txSummary.transaction.inputs,
          },
          predicate,
          // @ts-expect-error - no summary.type for this transaction
          summary: { operations: txSummary.operations },
          network: { chainId: Number(chainId), url: networkUrl },
        };

        const transaction = await Transaction.create(newTransaction)
          .save()
          .then(res => res)
          .catch(err => {
            throw new Internal({
              title: 'Error creating transaction',
              detail: err instanceof Error ? err.message : 'Unknown error',
              type: ErrorTypes.Internal,
            });
          });

        const transactionHistory = await TransactionController.formatTransactionsHistory(
          transaction,
        );

        emitTransaction(meldData.user.id, {
          transaction: Transaction.formatTransactionResponse({
            ...transaction,
            rampTransaction: meldData,
          } as Transaction),
          to: SocketUsernames.UI,
          history: transactionHistory as ITransactionHistory[],
          sessionId: meldData.user.id,
          type: SocketEvents.TRANSACTION_CREATED,
        });

        await RampTransaction.update(meldData.id, {
          providerData: {
            ...meldData.providerData,
            transactionData: meldTxData,
            paymentStatus: data.payload.paymentTransactionStatus,
          },
          destinationAmount: meldTxData.destinationAmount.toString(),
          transaction,
        }).catch(error => {
          throw new Internal({
            title: 'Error updating Ramp transaction',
            detail: error instanceof Error ? error.message : 'Unknown error',
            type: ErrorTypes.Internal,
          });
        });
        return;
      }

      await Transaction.update(meldData.transaction.id, {
        status: getTransactionStatusByPaymentStatus(
          data.payload.paymentTransactionStatus,
        ),
      }).catch(error => {
        throw new Internal({
          title: 'Error updating transaction status',
          detail: error instanceof Error ? error.message : 'Unknown error',
          type: ErrorTypes.Internal,
        });
      });

      const updatedTx = await Transaction.findOneOrFail({
        where: { id: meldData.transaction.id },
        relations: { predicate: true, createdBy: true, rampTransaction: true },
      });

      const transactionHistory = (await TransactionController.formatTransactionsHistory(
        updatedTx,
      )) as ITransactionHistory[];

      emitTransaction(meldData.user.id, {
        transaction: Transaction.formatTransactionResponse(updatedTx),
        to: SocketUsernames.UI,
        history: transactionHistory,
        sessionId: meldData.user.id,
        type: SocketEvents.TRANSACTION_UPDATED,
      });

      await RampTransaction.update(meldData.id, {
        providerData: {
          ...meldData.providerData,
          paymentStatus: data.payload.paymentTransactionStatus,
        },
      }).catch(error => {
        throw new Internal({
          title: 'Error updating Ramp transaction',
          detail: error instanceof Error ? error.message : 'Unknown error',
          type: ErrorTypes.Internal,
        });
      });
    }
  }
}

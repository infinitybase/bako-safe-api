import { type DeployTransfer, Vault } from 'bakosafe';
import { hash, TransactionType, ZeroBytes32 } from 'fuels';
import { TAI64 } from 'tai64';

import { toTransaction } from '@/utils';
import { SuccessStatus } from '@/generated';

export const submitAndAwait = {
  subscribe: async function* (_, args, context) {
    const { apiToken, vaultId } = context;

    // const tx = toTransaction(args.tx);
    //
    // try {
    //   if (tx.type !== TransactionType.Create) {
    //     throw new Error('Only TransactionType.Create are supported');
    //   }
    //
    //   const vault = await Vault.create({
    //     id: vaultId,
    //     ...apiToken,
    //   });
    //   tx.witnesses = [tx.witnesses.at(tx.bytecodeWitnessIndex)];
    //   const deployTransfer = await vault.BakoSafeDeployContract(tx);
    //
    //   console.log(
    //     'Transaction submitted to BAKO: ',
    //     deployTransfer.getHashTxId(),
    //   );
    //
    //   yield deployTransfer;
    // } catch (error) {
    //   console.error(error);
    //   throw error;
    // }

    console.log('Transaction submitted to BAKO: ', '0x1234567890');
    yield {
      getHashTxId: () => `37cda821d98091066afab7b7ce0d1e044064a8638d342805648476842ee2ea90`
    }
  },
  resolve: (payload: DeployTransfer) => {
    return {
      __typename: 'SuccessStatus',
      transactionId: `0x${payload.getHashTxId()}`,
      block: {
        consensus: {},
        transactions: [],
        id: ZeroBytes32,
        height: '0',
        header: {
          applicationHash: ZeroBytes32,
          consensusParametersVersion: '0',
          daHeight: '0',
          eventInboxRoot: ZeroBytes32,
          height: '0',
          id: ZeroBytes32,
          messageOutboxRoot: ZeroBytes32,
          messageReceiptCount: '0',
          prevRoot: ZeroBytes32,
          stateTransitionBytecodeVersion: '0',
          time: TAI64.now().toUnix().toString(),
          transactionsCount: '2',
          transactionsRoot: ZeroBytes32,
        },
      },
      time: TAI64.now().toUnix().toString(),
      receipts: [],
      totalGas: '1063605',
      totalFee: '11561',
    } as SuccessStatus;
  },
}
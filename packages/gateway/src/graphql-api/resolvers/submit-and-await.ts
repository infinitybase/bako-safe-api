import { type DeployTransfer } from 'bakosafe';
import { TransactionType, ZeroBytes32 } from 'fuels';
import { TAI64 } from 'tai64';

import { toTransaction } from '@/utils';
import { SuccessStatus } from '@/generated';
import { AuthService } from '@/service';

export const submitAndAwait = {
  subscribe: async function* (_, args, context) {
    const { apiToken, userId } = context;

    const transaction = toTransaction(args.tx);

    try {
      if (transaction.type !== TransactionType.Create) {
        throw new Error('Only TransactionType.Create are supported');
      }

      const authService = await AuthService.instance();
      const vault = await authService.getVaultFromApiToken(apiToken, userId);
      console.log('[INFO] Vault', {
        id: vault.BakoSafeVaultId,
        address: vault.address.toB256(),
        vaultProvider: vault.provider.url,
      });
      transaction.witnesses = [transaction.witnesses.at(transaction.bytecodeWitnessIndex)];
      const deployTransfer = await vault.BakoSafeDeployContract(transaction);

      yield deployTransfer;
    } catch (error) {
      console.error(error);
      throw error;
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
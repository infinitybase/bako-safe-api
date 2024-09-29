import { TransactionCreate, TransactionType, ZeroBytes32, TransactionUpgrade } from "fuels";
import { TAI64 } from "tai64";

import { SuccessStatus } from "@/generated";
import { toTransaction } from "@/utils";
import { AuthService, TransactionService } from "@/service";

export const submitAndAwait = {
  subscribe: async function* (_, args, context) {
    const { apiToken, userId, database } = context;

    const transaction = toTransaction(args.tx);

    try {
      const authService = new AuthService(database);
      const transactionService = new TransactionService(authService);

      let vault;
      let transactionId;

      if (transaction.type === TransactionType.Create) {
        const submitResponse = await transactionService.submitDeploy({
          userId,
          apiToken,
          transaction: <TransactionCreate>transaction
        });
        vault = submitResponse.vault;
        transactionId = submitResponse.deployTransfer.getHashTxId();
      }

      if (transaction.type === TransactionType.Upgrade) {
        const submitResponse = await transactionService.submitUpgrade({
          userId,
          apiToken,
          transaction: <TransactionUpgrade>transaction
        });
        vault = submitResponse.vault;
        transactionId = submitResponse.upgradeTransfer.getHashTxId();
      }

      console.log("[SUBSCRIPTION] Transaction sent to Bako", {
        vault: vault.BakoSafeVaultId,
        address: vault.address.toAddress(),
        transactionId
      });

      yield transactionId;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  resolve: (payload: string) => {
    return {
      __typename: "SuccessStatus",
      transactionId: `0x${payload}`,
      blockHeight: "0",
      block: {
        consensus: {},
        transactions: [],
        id: ZeroBytes32,
        height: "0",
        header: {
          applicationHash: ZeroBytes32,
          consensusParametersVersion: "0",
          daHeight: "0",
          eventInboxRoot: ZeroBytes32,
          height: "0",
          id: ZeroBytes32,
          messageOutboxRoot: ZeroBytes32,
          messageReceiptCount: "0",
          prevRoot: ZeroBytes32,
          stateTransitionBytecodeVersion: "0",
          time: TAI64.now().toUnix().toString(),
          transactionsCount: "2",
          transactionsRoot: ZeroBytes32
        }
      },
      time: TAI64.now().toUnix().toString(),
      receipts: [],
      totalGas: "1063605",
      totalFee: "11561"
    } as SuccessStatus;
  }
};
import {
  TransactionCreate,
  TransactionType,
  TransactionUpgrade,
} from "fuels";
import { delegateToSchema } from "@graphql-tools/delegate";
import { OperationTypeNode } from "graphql/language";

import { MutationResolvers } from "@/generated";
import { toTransaction } from "@/utils";
import { AuthService, TransactionService } from "@/service";

export const submit: MutationResolvers["submit"] = async (
  _,
  args,
  context,
  info
) => {
  const { schema, apiToken, userId, database } = context;
  const transaction = toTransaction(args.tx);

  const authService = new AuthService(database);
  const transactionService = new TransactionService(authService);

  if (transaction.type === TransactionType.Upgrade) {
    const { upgradeTransfer } = await transactionService.submitUpgrade({
      userId,
      apiToken,
      transaction: <TransactionUpgrade>transaction,
    });
    return {
      id: `0x${upgradeTransfer.getHashTxId()}`,
    };
  }

  if (transaction.type === TransactionType.Create) {
    const submitResponse = await transactionService.submitDeploy({
      userId,
      apiToken,
      transaction: <TransactionCreate>transaction,
    });
    const { deployTransfer, vault } = submitResponse;

    console.log("[MUTATION] Transaction sent to Bako", {
      vault: vault.BakoSafeVaultId,
      address: vault.address.toAddress(),
      transactionId: deployTransfer.getHashTxId(),
    });

    return {
      id: `0x${deployTransfer.getHashTxId()}`,
    };
  }

  return delegateToSchema({
    schema,
    operation: OperationTypeNode.MUTATION,
    fieldName: "submit",
    args,
    context,
    info,
  });
};

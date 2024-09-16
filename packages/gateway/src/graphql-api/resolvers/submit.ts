import {
  TransactionCreate,
  TransactionType,
  TransactionUpgrade,
  TransactionUpload,
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
    const { hash } = await transactionService.submitUpgrade({
      userId,
      apiToken,
      transaction: <TransactionUpgrade>transaction,
    });
    return { id: hash };
  }

  if (transaction.type === TransactionType.Upload) {
    const { hash } = await transactionService.submitUpload({
      userId,
      apiToken,
      transaction: <TransactionUpload>transaction,
    });
    return { id: hash };
  }

  if (transaction.type === TransactionType.Create) {
    const { hash } = await transactionService.submitDeploy({
      userId,
      apiToken,
      transaction: <TransactionCreate>transaction,
    });
    return { id: hash };
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

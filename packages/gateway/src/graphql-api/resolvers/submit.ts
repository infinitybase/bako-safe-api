import { TransactionType } from "fuels";
import { delegateToSchema } from "@graphql-tools/delegate";
import { OperationTypeNode } from "graphql/language";

import { MutationResolvers } from "@/generated";
import { toTransaction } from "@/utils";
import { AuthService, TransactionService } from '@/service';

export const submit: MutationResolvers["submit"] = async (
  _,
  args,
  context,
  info
) => {
  const { schema, apiToken, userId, database } = context;
  const transaction = toTransaction(args.tx);

  if (transaction.type === TransactionType.Create) {
    const authService = new AuthService(database);
    const transactionService = new TransactionService(transaction, authService);
    const submitResponse = await transactionService.submit({ apiToken, userId });
    const { deployTransfer, vault } = submitResponse;

    console.log('[MUTATION] Transaction sent to Bako', {
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

import { TransactionType } from "fuels";
import { BakoSafe } from "bakosafe";
import { delegateToSchema } from "@graphql-tools/delegate";
import { OperationTypeNode } from "graphql/language";

import { MutationResolvers } from "@/generated";
import { toTransaction } from "@/utils";
import { AuthService } from "@/service";

export const submit: MutationResolvers["submit"] = async (
  parent,
  args,
  context,
  info
) => {
  const { schema, apiToken, userId } = context;
  const transaction = toTransaction(args.tx);

  if (transaction.type === TransactionType.Create) {
    const authService = await AuthService.instance();
    const { vault, codeId } = await authService.getVaultFromApiToken(apiToken, userId);
    transaction.witnesses = [
      transaction.witnesses.at(transaction.bytecodeWitnessIndex),
    ];
    const deployTransfer = await vault.BakoSafeDeployContract(transaction);
    await authService.closeSession(codeId);

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

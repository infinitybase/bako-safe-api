import { MutationResolvers } from "@/generated";
import { toTransaction } from "@/utils";
import { AuthService, TransactionService } from "@/service";
import {
  hexlify,
  isTransactionTypeBlob,
  isTransactionTypeCreate,
  isTransactionTypeScript,
  isTransactionTypeUpgrade,
  isTransactionTypeUpload,
  OutputType,
} from "fuels";

export const submit: MutationResolvers["submit"] = async (
  _,
  args,
  context,
  info
) => {
  const { schema, apiToken, userId, database } = context;
  let transaction = toTransaction(args.tx);

  const authService = new AuthService(database);
  const transactionService = new TransactionService(authService);

  const { hash, transactionRequest } = await transactionService.submit({
    userId,
    apiToken,
    transaction,
  });

  transaction = transactionRequest.toTransaction();

  return {
    id: hash,
    isMint: false,
    outputs: transaction.outputs.map((output) => {
      switch (output.type) {
        case OutputType.ContractCreated:
          return {
            __typename: "ContractCreated",
            contract: output.contractId,
            stateRoot: output.stateRoot,
          };
        case OutputType.Change:
          return {
            __typename: "ChangeOutput",
            amount: output.amount,
            assetId: output.assetId,
            to: output.to,
          };
        case OutputType.Coin:
          return {
            __typename: "CoinOutput",
            amount: output.amount,
            assetId: output.assetId,
            to: output.to,
          };
        case OutputType.Contract:
          return {
            __typename: "ContractOutput",
            balanceRoot: output.balanceRoot,
            inputIndex: output.inputIndex,
            stateRoot: output.stateRoot,
          };
      }
    }),
    isBlob: isTransactionTypeBlob(transactionRequest),
    isCreate: isTransactionTypeCreate(transactionRequest),
    isUpload: isTransactionTypeUpload(transactionRequest),
    isScript: isTransactionTypeScript(transactionRequest),
    isUpgrade: isTransactionTypeUpgrade(transactionRequest),
    rawPayload: hexlify(transactionRequest.toTransactionBytes()),
  };
};

import { TransactionType } from "fuels";
import { delegateToSchema } from "@graphql-tools/delegate";
import { OperationTypeNode } from "graphql/language";

import { MutationResolvers } from "@/generated";
import { toTransaction } from "@/utils";

export const submit: MutationResolvers["submit"] = async (
  parent,
  args,
  context,
  info
) => {
  const { schema } = context;
  const transaction = toTransaction(args.tx);

  if (transaction.type === TransactionType.Create) {
    console.log("HERE");
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

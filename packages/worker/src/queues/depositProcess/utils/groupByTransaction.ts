import type {
  PredicateDeposit,
  Output,
  Input,
  Transaction,
  PredicateDepositTx,
} from "../types";

export async function groupByTransaction(
  data: PredicateDeposit[]
) {

  if (!data) return [];

  const filterData = data.flatMap((item: PredicateDeposit) => {
    const transactions = item.transactions ?? [];
    const inputs = item.inputs ?? [];
    const outputs = item.outputs ?? [];
  
    const inputByTxId = new Map(inputs.map((input: Input) => [input.tx_id, input]));
  
    return transactions.flatMap((transaction: Transaction) => {
      const input = inputByTxId.get(transaction.id);
      if (!input) return [];
  
      const filteredOutputs = outputs.filter(
        (o: Output) =>
          o.tx_id === transaction.id && (o.output_type === 0 || o.output_type === 3)
      );
  
      return filteredOutputs.map((output) => ({
        transaction,
        input,
        output,
      }));
    });
  });

  return filterData;
}

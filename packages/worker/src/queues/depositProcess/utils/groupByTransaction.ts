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

    const outputByTxId = new Map(
      outputs
        .filter((o) => o.output_type === 0 || o.output_type === 3)
        .map((o: Output) => [o.tx_id, o])
    );

    const inputByTxId = new Map(inputs.map((input: Input) => [input.tx_id, input]));

    return transactions.map((transaction: Transaction): PredicateDepositTx | null => {
      const output = outputByTxId.get(transaction.id);
      const input = inputByTxId.get(transaction.id);

      if (!output || !input) return null;

      return { transaction, outputs, inputs };
    }).filter(Boolean);
  });

  return filterData.filter(Boolean) as PredicateDepositTx[];
}

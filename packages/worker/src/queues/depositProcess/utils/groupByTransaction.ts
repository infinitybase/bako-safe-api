import type {
  PredicateDeposit,
  Output,
  Block,
  Input,
  Transaction,
  PredicateDepositTx,
} from "../types";

export function groupByTransaction(
  data: PredicateDeposit[]
): PredicateDepositTx[] {

  const filterData = data.flatMap((item: PredicateDeposit) => {
    const transactions = item.transactions ?? [];
    const inputs = item.inputs ?? [];
    const outputs = item.outputs ?? [];
    const blocks = item.blocks ?? [];

    const outputByTxId = new Map(outputs.map((output: Output) => [output.tx_id, output]));
    const blockByHeight = new Map(blocks.map((block: Block) => [block.height, block]));

    return transactions.map((transaction: Transaction): PredicateDepositTx | null => {
      const output = outputByTxId.get(transaction.id);
      const block = blockByHeight.get(transaction.block_height);
      const input = inputs.find((input: Input) => input.tx_id === transaction.id);

      if (!output || !block || !input) return null;

      return { transaction, output, block, input };
    }).filter(Boolean);
  });

  return filterData.filter(Boolean) as PredicateDepositTx[];
}

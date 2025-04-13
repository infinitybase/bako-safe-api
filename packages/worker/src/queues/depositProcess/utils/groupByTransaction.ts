import { TRANSACTION_STATUS } from "../constants";
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
  
  // const groupedData = filterData.map((item) => {
  //   if (!item) return null;
    
  //   return {
  //     predicateId: item?.output?.to,
  //     hash: item?.output?.tx_id,
  //     status: item?.output?.tx_status,
  //     sendTime: item?.block?.time || item?.transaction?.time,
  //     created_at: item?.block?.time || item?.transaction?.time,
  //     updated_at: item?.block?.time || item?.transaction?.time,
  //     //   'deleted_at': null,
  //     summary: {
  //       type: "worker",
  //       operations: [
  //         {
  //           to: {
  //             type: 1,
  //             address: item?.output?.to
  //           },
  //           from: {
  //             type: 1,
  //             address: item?.input?.owner
  //           },
  //           name: "Transfer asset",
  //           assetsSent: [
  //             {
  //               amount: item?.output?.amount,
  //               assetId: item?.output?.asset_id
  //             }
  //           ]
  //         }
  //       ]
  //     },
  //     type: item?.output?.tx_type,
  //     network: "de acordo com o endpoitn de envio utilizado"
  //   }
  // });

  return filterData.filter(Boolean) as PredicateDepositTx[];
}

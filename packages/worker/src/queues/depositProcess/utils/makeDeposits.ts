import type { PredicateDepositData, PredicateDepositTx } from "../types";
import { getSummaryTransactionFuels } from "./getSummaryTransactionFuels";

export async function makeDeposits(
  tx_data: PredicateDepositTx[],
): Promise<PredicateDepositData[] | null> {

  const status: Record<number, string> = {
    1: "success",
    3: "failure",
  }

  const tx_type: Record<number, string> = {
    0: "TRANSACTION_SCRIPT",
    1: "TRANSACTION_CREATE",
    2: "TRANSACTION_BLOB",
    3: "TRANSACTION_UPGRADE",
    4: "TRANSACTION_UPLOAD",
  }

  const output_type = {
    0: "coin_output",
    1: "contract_output",
    2: "change_output",
    3: "variable_output",
    4: "contract_created",
  }

  const perserHash = (hash: string) => {
    return hash.replace('0x', '');
  }

  const groupedData = await Promise.all(tx_data.map(async (item: PredicateDepositTx) => {
    if (!item) return null;

    const summary = await getSummaryTransactionFuels(item);

    return {
      predicateId: item?.output?.to,
      hash: perserHash(item?.output?.tx_id),
      status: status[item?.output?.tx_status],
      sendTime: new Date(item?.transaction?.time ?? 0),
      created_at: new Date(item?.transaction?.time ?? 0),
      updated_at: new Date(item?.transaction?.time ?? 0),
      summary: {
        type: summary.type,
        operations: summary.operations,
      },
      type: tx_type[item?.output?.tx_type],
    } as PredicateDepositData;
  }));

  return groupedData.filter(Boolean) as PredicateDepositData[];
}

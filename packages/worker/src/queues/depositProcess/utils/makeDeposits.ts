import type { PredicateDepositData, PredicateDepositTx } from "../types";
import { getSummaryTransactionFuels } from "./getSummaryTransactionFuels";

export async function makeDeposits(
  tx_data: PredicateDepositTx[],
  predicate: any
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

  const parserHash = (hash: string) => {
    return hash.replace('0x', '');
  }

  const getDepositType = (item: PredicateDepositTx) => {
    return tx_type[item?.output?.tx_type] === tx_type[0] ? "DEPOSIT" : tx_type[item?.output?.tx_type];
  }

  const groupedData = await Promise.all(tx_data.map(async (item: PredicateDepositTx) => {
    if (!item) return null;

    const summary = await getSummaryTransactionFuels(item);
    const config = JSON.parse(predicate.configurable);

    return {
      predicateId: item?.output?.to,
      hash: parserHash(item?.output?.tx_id),
      status: status[item?.output?.tx_status],
      sendTime: new Date((item?.transaction?.time ?? 0) * 1000),
      created_at: new Date((item?.transaction?.time ?? 0) * 1000),
      updated_at: new Date((item?.transaction?.time ?? 0) * 1000),
      summary: {
        type: summary.type,
        operations: summary.operations,
      },
      gasUsed: summary.gasUsed.format(),
      resume: {
        hash: parserHash(item?.output?.tx_id),
        status: status[item?.output?.tx_status],
        witnesses: [],
        requiredSigners: config.SIGNATURES_COUNT ?? 1,
        totalSigners: predicate.members?.length ?? 0,
        predicate: {
          id: predicate.id,
          address: predicate.predicateAddress,
        },
        id: item.transaction?.id,
      },
      type: getDepositType(item),
    } as PredicateDepositData;
  }));

  return groupedData.filter(Boolean) as PredicateDepositData[];
}

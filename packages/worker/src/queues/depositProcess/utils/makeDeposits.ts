import type { PredicateDepositData, PredicateDepositTx } from "../types";

export async function makeDeposits(
  tx_data: PredicateDepositTx[],
): Promise<PredicateDepositData[] | null> {

  const status = {
    1: "success",
    3: "failure",
  }

  const tx_type = {
    0: "script",
    1: "create",
    2: "mint",
    3: "upgrade",
    4: "upload",
  }

  const output_type = {
    0: "coin_output",
    1: "contract_output",
    2: "change_output",
    3: "variable_output",
    4: "contract_created",
  }

  const groupedData = tx_data.map((item: PredicateDepositTx) => {
    if (!item) return null;

    return {
      predicateId: item?.output?.to,
      hash: item?.output?.tx_id, // Todo[Erik]: Tratar hash para remover o 0x do inicio da hash
      status: item?.output?.tx_status,
      sendTime: new Date(item?.block?.time || item?.transaction?.time),
      created_at: new Date(item?.block?.time || item?.transaction?.time),
      updated_at: new Date(item?.block?.time || item?.transaction?.time),
      summary: {
        type: "worker",
        operations: [
          {
            to: {
              type: status[1], // Todo[Erik]: Verificar se retorna da API
              address: item?.output?.to
            },
            from: {
              type: tx_type[1], // Todo[Erik]: Verificar se retorna da API
              address: item?.input?.owner
            },
            name: "Transfer asset",
            assetsSent: [
              {
                amount: item?.output?.amount,
                assetId: item?.output?.asset_id
              }
            ]
          }
        ]
      },
      type: item?.output?.tx_type,
      network: "de acordo com o endpoitn de envio utilizado"
    } as PredicateDepositData;
  });

  return groupedData.filter((item): item is PredicateDepositData => item !== null);
}

import { InputType, bn, OutputType } from "fuels";
import type { SchemaPredicateBalance } from "../../../utils/mongoClient";
import { ETH } from "../constants";
import type { PredicateBalanceGrouped } from "../types";

export async function makeDeposits(
  tx_grouped: PredicateBalanceGrouped,
  predicate_address: string
): Promise<SchemaPredicateBalance[]> {
  const deposits: SchemaPredicateBalance[] = [];
  // biome-ignore lint/complexity/noForEach: <explanation>
  Object.entries(tx_grouped).forEach(([tx_id, { inputs, outputs }]) => {
    const inputs_grouped_by_assetId: {
      [assetId: string]: number;
    } = {};
    // soma todos os inputs que o vault enviou
    for (const i of inputs) {
      const isInputedByVault =
        i.input_type === InputType.Coin && i.owner === predicate_address;
      // message sempre sao valores em ETH
      const isMessageOfL1 =
        i.input_type === InputType.Message &&
        i.recipient === predicate_address &&
        i.asset_id ===
          "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07";
      if (isInputedByVault || isMessageOfL1) {
        if (!inputs_grouped_by_assetId[i.asset_id]) {
          inputs_grouped_by_assetId[i.asset_id] = bn(i.amount).toNumber();
        } else {
          inputs_grouped_by_assetId[i.asset_id] = bn(
            inputs_grouped_by_assetId[i.asset_id]
          )
            .add(i.amount)
            .toNumber();
        }
      }

      // mensagem é somada aos inputs, porque é um input para ser usado pelo vault
      if (isMessageOfL1) {
        deposits.push({
          tx_id,
          amount: bn(i.amount).toNumber(),
          assetId: ETH,
          predicate: predicate_address,
          usdValue: 0.0,
          createdAt: new Date(tx_grouped[tx_id].time),
          verifiedToken: true,
          isDeposit: true,
          formatedAmount: 0.0,
        });
      }
    }

    for (const o of outputs) {
      const isOutputedByVault =
        o.output_type === OutputType.Change && o.to === predicate_address;
      if (isOutputedByVault) {
        if (!inputs_grouped_by_assetId[o.asset_id]) {
          // this should never happen
          inputs_grouped_by_assetId[o.asset_id] = 0;
        } else {
          inputs_grouped_by_assetId[o.asset_id] = bn(
            inputs_grouped_by_assetId[o.asset_id]
          )
            .sub(o.amount)
            .toNumber();
        }
      }
    }

    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(inputs_grouped_by_assetId).forEach(([assetId, value]) => {
      deposits.push({
        tx_id,
        amount: value,
        assetId,
        predicate: predicate_address,
        usdValue: 0.0,
        createdAt: new Date(tx_grouped[tx_id].time),
        verifiedToken: true,
        isDeposit: false,
        formatedAmount: 0.0,
      });
    });

    // soma todos os outputs que o vault recebeu
    for (const o of outputs) {
      const is =
        o.output_type === OutputType.Coin ||
        o.output_type === OutputType.Variable;

      if (is && o.to === predicate_address) {
        deposits.push({
          tx_id,
          amount: bn(o.amount).toNumber(),
          assetId: o.asset_id,
          predicate: predicate_address,
          usdValue: 0.0,
          createdAt: new Date(tx_grouped[tx_id].time),
          verifiedToken: false,
          isDeposit: true,
          formatedAmount: 0.0,
        });
      }
    }
  });

  return deposits;
}

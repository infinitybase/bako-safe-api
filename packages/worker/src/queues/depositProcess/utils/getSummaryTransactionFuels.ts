import { PredicateDepositTx } from "../types";

import {
	assembleTransactionSummaryFromJson,
	hexlify,
	InputType,
	Provider,
	ScriptTransactionRequest
} from "fuels";

export async function getSummaryTransactionFuels({
  inputs,
  outputs
}: PredicateDepositTx) {
  const provider = new Provider("https://testnet.fuel.network/v1/graphql");

  const requestsTransactions = ScriptTransactionRequest.from({
    outputs: [{
      type: outputs[0].output_type,
      amount: outputs[0].amount,
      assetId: outputs[0].asset_id,
      to: outputs[0].to,
    }],
    inputs: [{
      type: inputs[0].input_type as InputType.Coin,
      amount: inputs[0].amount || "0",
      assetId: inputs[0].asset_id,
      txPointer: "0x",
      witnessIndex: inputs[0].witness_index || 0,
      id: inputs[0].utxo_id || "0x",
      owner: inputs[0].owner,
    }],
  });

  const summary = await assembleTransactionSummaryFromJson({
  	provider,
  	transactionSummary: {
  		gasPrice: "1",
  		receipts: [],
  		transactionBytes: hexlify(requestsTransactions.toTransactionBytes()),
  		id: requestsTransactions.getTransactionId(0),
  	},
  });

  return summary;
}
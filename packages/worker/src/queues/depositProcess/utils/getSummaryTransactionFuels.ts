import { networks } from "@/mocks/networks";
import { PredicateDepositTx } from "../types";

import {
	assembleTransactionSummaryFromJson,
	hexlify,
	InputType,
	Provider,
	ScriptTransactionRequest
} from "fuels";

export async function getSummaryTransactionFuels({
  input,
  output
}: PredicateDepositTx) {
  const url = process.env.WORKER_ENVIRONMENT === 'production' ? networks['mainnet'] : networks['devnet'];
  const provider = new Provider(url);

  const requestsTransactions = ScriptTransactionRequest.from({
    outputs: [{
      type: output.output_type,
      amount: output.amount,
      assetId: output.asset_id,
      to: output.to,
    }],
    inputs: [{
      type: input.input_type as InputType.Coin,
      amount: input.amount || "0",
      assetId: input.asset_id,
      txPointer: "0x",
      witnessIndex: input.witness_index || 0,
      id: input.utxo_id || "0x",
      owner: input.owner,
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
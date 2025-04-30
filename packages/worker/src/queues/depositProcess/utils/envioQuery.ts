export const makeQuery = ({
  from_block,
  predicate_address
}: { from_block?: number; predicate_address: string }) => {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "from_block": from_block,
      "outputs": [
        {
          "output_type": [
            0,
            3
          ],
          "tx_status": [
            1
          ],
          "to": [
            predicate_address
          ]
        }
      ],
      "field_selection": {
        "transaction": [
          "id",
          "block_height",
          "time",
          "status",
          "mint_gas_price"
        ],
        "output": [
          "tx_id",
          "tx_type",
          "tx_status",
          "to",
          "amount",
          "asset_id",
          "output_type"
        ],
        "input": [
          "tx_id",
          "tx_status",
          "input_type",
          "owner",
          "asset_id",
          "amount",
          "witness_index",
          "owner",
          "utxo_id"
        ]
      },
      "join_mode": "JoinAll"
    })
  };
};

export const predicateTransactions = async (predicate: string, block: number) => {
  const queryUrl = makeQuery({
    from_block: block,
    predicate_address: predicate
  });

  const networks = {
    testnet: "https://fuel-testnet.hypersync.xyz",
    mainnet: "https://fuel.hypersync.xyz"
  }

  const url = process.env.WORKER_ENVIRONMENT === "production" ? networks.mainnet : networks.testnet;

  const data = await fetch(`${url}/query`, queryUrl).then(res => res.json());
  return data ?? undefined;
}
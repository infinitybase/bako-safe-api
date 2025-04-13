export const makeQuery = ({
  from_block = 27066725,
  predicate_address = '0x2E8aa750d32892016B22306d6FE0E5753851F43d1448332f7997AFae4fDc81e0',
}: { from_block?: number; predicate_address: string }) => {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "from_block": from_block,
      "inputs": [
        {
          "tx_status": [
            1
          ],
          "tx_type": [
            0
          ],
          "input_type": [
            0,
            2
          ]
        }
      ],
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
        "block": [
          "id",
          "time",
          "height"
        ],
        "transaction": [
          "id",
          "block_height",
          "time",
          "status",
          "block_height"
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
          "owner",
          "asset_id"
        ]
      }
    }),
  };
};

export const predicateTransactions = async (predicate: string, block: number) => {
  const data = await fetch(
    "https://fuel-testnet.hypersync.xyz/query",
    makeQuery({
      from_block: block,
      predicate_address: predicate
    })
  );
  const response = await data.json();
  return response ?? undefined;
}
import { Collection } from "mongodb";
import { GaslessUtxo } from "../types";

export const markSpent = async (
  collection: Collection<GaslessUtxo>,
  utxoId: string,
  spentTxHash: string
): Promise<GaslessUtxo | null> => {
  return collection.findOneAndUpdate(
    { utxoId, status: "reserved" },
    {
      $set: { status: "spent", spentTxHash },
      $unset: { reservedBy: "", reservedAt: "" },
    },
    { returnDocument: "after" }
  );
};

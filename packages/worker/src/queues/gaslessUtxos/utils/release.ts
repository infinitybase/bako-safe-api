import { Collection } from "mongodb";
import { GaslessUtxo } from "../types";

export const release = async (
  collection: Collection<GaslessUtxo>,
  utxoId: string
): Promise<GaslessUtxo | null> => {
  return collection.findOneAndUpdate(
    { utxoId, status: "reserved" },
    {
      $set: { status: "available" },
      $unset: { reservedBy: "", reservedAt: "" },
    },
    { returnDocument: "after" }
  );
};

import { Collection } from "mongodb";
import { GaslessUtxo, ReserveUtxoOptions } from "../types";

export const reserve = async (
  collection: Collection<GaslessUtxo>,
  options: ReserveUtxoOptions
): Promise<GaslessUtxo | null> => {
  const { reservedBy, estimatedMaxFee } = options;

  const minAmount = String(Math.ceil(estimatedMaxFee * 1.5));

  return collection.findOneAndUpdate(
    { status: "available", amount: { $gte: minAmount } },
    {
      $set: {
        status: "reserved",
        reservedBy,
        reservedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
};

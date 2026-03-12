import { Collection } from "mongodb";
import { GaslessUtxo, ReserveUtxoOptions } from "../types";

export const reserve = async (
  collection: Collection<GaslessUtxo>,
  options: ReserveUtxoOptions
): Promise<GaslessUtxo | null> => {
  const { reservedBy, estimatedMaxFee } = options;

  const minAmount = (
    (BigInt(Math.floor(estimatedMaxFee)) * BigInt(150)) /
    BigInt(100)
  ).toString();

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

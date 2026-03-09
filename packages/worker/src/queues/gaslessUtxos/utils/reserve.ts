import { Collection } from "mongodb";
import { GaslessUtxo, ReserveUtxoOptions } from "../types";
import { DEFAULT_TTL_SECONDS } from "@/queues/gaslessUtxos/constants";

export const reserve = async (
  collection: Collection<GaslessUtxo>,
  options: ReserveUtxoOptions
): Promise<GaslessUtxo | null> => {
  const { reservedBy, ttlSeconds = DEFAULT_TTL_SECONDS } = options;

  return collection.findOneAndUpdate(
    { status: "available" },
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

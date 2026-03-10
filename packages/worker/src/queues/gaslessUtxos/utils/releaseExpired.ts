import { Collection } from "mongodb";
import { GaslessUtxo } from "@/queues/gaslessUtxos";
import { RESERVE_TTLS_MS } from "@/queues/gaslessUtxos";

export const releaseExpired = async (
  collection: Collection<GaslessUtxo>
): Promise<number> => {
  const expiredBefore = new Date(Date.now() - RESERVE_TTLS_MS);

  const result = await collection.updateMany(
    { status: "reserved", reservedAt: { $lte: expiredBefore } },
    {
      $set: { status: "available" },
      $unset: { reservedBy: "", reservedAt: "" },
    }
  );

  return result.modifiedCount;
};

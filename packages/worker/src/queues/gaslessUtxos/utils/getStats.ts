import { Collection } from "mongodb";
import { GaslessUtxo, GaslessUtxoStats } from "../types";

export const getStats = async (
  collection: Collection<GaslessUtxo>
): Promise<GaslessUtxoStats> => {
  const result = await collection
    .aggregate<{ _id: string; count: number; totalAmount: string }>([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: { $toLong: "$amount" } },
        },
      },
    ])
    .toArray();

  const stats = { available: 0, reserved: 0, spent: 0, totalValue: BigInt(0) };

  for (const row of result) {
    const status = row._id as keyof Omit<GaslessUtxoStats, "totalValue">;
    if (status in stats) {
      stats[status] = row.count;
    }
    stats.totalValue += BigInt(row.totalAmount ?? 0);
  }

  return {
    available: stats.available,
    reserved: stats.reserved,
    spent: stats.spent,
    totalValue: stats.totalValue.toString(),
  };
};

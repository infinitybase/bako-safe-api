import { Collection } from "mongodb";
import { GaslessUtxo, GaslessUtxoStats } from "../types";

export const getStats = async (
  collection: Collection<GaslessUtxo>
): Promise<GaslessUtxoStats> => {
  const rows = await collection
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();

  const stats: GaslessUtxoStats = {
    available: 0,
    reserved: 0,
    spent: 0,
    total: 0,
  };

  for (const row of rows) {
    const key = row._id as keyof Omit<GaslessUtxoStats, "total">;
    if (key in stats) stats[key] = row.count;
    stats.total += row.count;
  }

  return stats;
};

import { Collection } from "mongodb";
import { GaslessUtxo } from "../types";

export const findAvailable = async (
  collection: Collection<GaslessUtxo>
): Promise<GaslessUtxo[]> => {
  return collection.find({ status: "available" }).toArray();
};

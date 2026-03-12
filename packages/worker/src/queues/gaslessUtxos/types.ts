import { ObjectId } from "mongodb";

export interface GaslessUtxo {
  _id?: ObjectId;
  utxoId: string;
  txId: string;
  outputIndex: number;
  amount: string;
  owner: string;
  status: "available" | "reserved" | "spent";
  reservedAt?: Date;
  reservedBy?: string;
  spentTxHash?: string;
  createdAt: Date;
}

export interface GaslessUtxoStats {
  available: number;
  reserved: number;
  spent: number;
  totalValue: string;
}

export interface ReserveUtxoOptions {
  reservedBy: string;
  estimatedMaxFee: number;
}

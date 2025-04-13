import { Block } from "../types";

export interface IDepositBlockServices<T> {
  syncLastBlock(predicate_address: string, block: Block): Promise<T>
  getLastBlock(predicate_address: string): Promise<T | null>
}
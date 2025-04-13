import { DepositBlockRepository } from "../repositories/depositBlockRepository";
import { Block } from "../types";
import { IDepositBlockServices } from "./IDepositBlockService";
import { SchemaPredicateBlocks } from "../../../clients/mongoClient";

export class DepositBlockService implements IDepositBlockServices<SchemaPredicateBlocks | Block> {
  constructor(private readonly depositBlockRepository: DepositBlockRepository) {}

  async syncLastBlock(predicate_address: string, block: Block) {
    await this.depositBlockRepository.syncLastBlock(predicate_address, block);
    return block;
  }

  async getLastBlock(predicate_address: string) {
    const block = await this.depositBlockRepository.getLastBlock(predicate_address);
    if (!block) {
      return null;
    }
    return block;
  }
}

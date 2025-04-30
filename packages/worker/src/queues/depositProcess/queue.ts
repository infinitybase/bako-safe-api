import Queue from "bull";
import {
  type QueueDeposit,
  groupByTransaction,
  makeDeposits,
  QUEUE_DEPOSIT
} from ".";
import { predicateTransactions } from "./utils/envioQuery";
import { redisConfig } from "@/clients";
import { DepositTransactionsFactory } from "./factories/depositTransactionsFactory";
import { DepositBlockFactory } from "./factories/depositBlockFactory";
import { PredicatesFactory } from "./factories/predicatesFactory";

const depositQueue = new Queue<QueueDeposit>(QUEUE_DEPOSIT, {
    redis: redisConfig,
})

depositQueue.process(async (job) => {
  const { predicate } = job.data;
  const { id: predicate_id, predicate_address } = predicate;

  try {
    const depositBlockService = await DepositBlockFactory.getInstance();
    const lastBlock = await depositBlockService.getLastBlock(predicate_address);

    const depositTransactions = await predicateTransactions(predicate_address, lastBlock?.blockNumber ?? 0);
  
    if (depositTransactions.next_block === lastBlock?.blockNumber) {
      console.log('[NO NEW BLOCKS]: ', depositTransactions.next_block);
      return `No new blocks for ${predicate_address}`;
    }

    const transactionsGrouped = await groupByTransaction(depositTransactions.data ?? []);

    if (transactionsGrouped.length === 0) {
      console.log('[MALFORMED TRANSACTIONS]: ', depositTransactions.next_block);
      return `Malformed transactions for ${predicate_address}`;
    }

    const formatedDepositsTransactions = await makeDeposits(transactionsGrouped, predicate);

    const depositTransactionService = await DepositTransactionsFactory.getInstance();
    await depositTransactionService.createAllDepositTransactions(predicate_id, formatedDepositsTransactions ?? []);

    await depositBlockService.syncLastBlock(predicate_address, depositTransactions.next_block);

    const predicateService = await PredicatesFactory.getInstance();
    await predicateService.setLastUpdatedPredicate(predicate_address, new Date());

    console.log(`[${QUEUE_DEPOSIT}] Processed deposits for ${predicate_address}`);
    return `Processed deposits for ${predicate_address}`;
  } catch (e) {
    console.error(e);
    throw e;
  }
});

export default depositQueue;
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
  const { predicate_id, /** predicate_address, */ } = job.data;
  const predicate_address = '0x2E8aa750d32892016B22306d6FE0E5753851F43d1448332f7997AFae4fDc81e0';

  try {
    const depositBlockService = await DepositBlockFactory.getInstance();
    const lastBlock = await depositBlockService.getLastBlock(predicate_address);

    const depositTransactions = await predicateTransactions(predicate_address, lastBlock?.blockNumber ?? 27066725);

    const transactionsGrouped = groupByTransaction(depositTransactions.data ?? []);

    const formatedDepositsTransactions = await makeDeposits(transactionsGrouped);

    const depositTransactionService = await DepositTransactionsFactory.getInstance();
    await depositTransactionService.createAllDepositTransactions(predicate_id, formatedDepositsTransactions ?? []);

    await depositBlockService.syncLastBlock(predicate_address, depositTransactions.next_block);

    const predicateService = await PredicatesFactory.getInstance();
    await predicateService.setLastUpdatedPredicate(predicate_address, new Date());

    return `Processed deposits for ${predicate_address}`;
  } catch (e) {
    console.error(e);
    throw e;
  }
});

export default depositQueue;
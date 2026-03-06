import Queue from "bull";
import { Provider, bn } from "fuels";
import type { BN } from "fuels";
import { redisConfig } from "@/clients";
import { networks } from "@/mocks/networks";
import { QUEUE_TRANSACTION } from "./constants";
import { loadVaultConfig } from "@/queues/generateTestTx/utils/loader";
import { createVault } from "@/queues/generateTestTx/utils/vault";
import { collectWitnesses } from "@/queues/generateTestTx/utils/signer";
import { estimateFeeWithBalance } from "@/queues/generateTestTx/utils/estimateFee";
import { logger } from "@/config/logger";

const transactionQueue = new Queue(QUEUE_TRANSACTION, {
  redis: redisConfig,
});

transactionQueue.process(1, async (job) => {
  logger.info(`[${QUEUE_TRANSACTION}] Job started`);

  let maxFee: BN | undefined;
  let gasPrice: BN | undefined;
  let balance: BN | undefined;

  const config = loadVaultConfig();
  logger.info(`[${QUEUE_TRANSACTION}] Network: ${config.network}`);

  const provider = new Provider(networks[config.network]);
  const vault = createVault(provider, config);

  try {
    ({ maxFee, gasPrice, balance } = await estimateFeeWithBalance(
      vault,
      config.defaultAmount
    ));
  } catch {
    try {
      const baseAssetId = await provider.getBaseAssetId();
      const { coins } = await vault.getCoins(baseAssetId);
      balance = coins.reduce((acc, c) => acc.add(c.amount), bn(0));
      gasPrice = await provider.getLatestGasPrice();
    } catch {}
  }

  try {
    const baseAsset = await provider.getBaseAssetId();
    const { tx, hashTxId, encodedTxId } = await vault.transaction({
      name: "Transaction Cron",
      assets: [
        {
          to: vault.address.toB256(),
          amount: config.defaultAmount,
          assetId: baseAsset,
        },
      ],
    });
    logger.info(`[${QUEUE_TRANSACTION}] Transaction created: ${hashTxId}`);

    const witnesses = await collectWitnesses(
      vault,
      hashTxId,
      encodedTxId,
      config.vault.signers,
      provider
    );
    logger.info(
      `[${QUEUE_TRANSACTION}] Witnesses collected: ${witnesses.length}`
    );

    if (witnesses.length === 0) {
      throw new Error("[Queue] No local signers available.");
    }

    tx.witnesses = witnesses;

    const result = await vault.send(tx);
    logger.info(`[${QUEUE_TRANSACTION}] TX sent, waiting for result...`);

    const response = await result.waitForResult();
    logger.info(`[${QUEUE_TRANSACTION}] TX SUCCESS`, {
      status: response.status,
      fee: response.fee?.toString(),
    });
  } catch (error) {
    const amountInUnits = bn.parseUnits(config.defaultAmount);

    logger.error(
      {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : String(error),
        gas: {
          maxFee: maxFee?.toString() ?? "unavailable",
          gasPrice: gasPrice?.toString() ?? "unavailable",
          balance: balance?.toString() ?? "unavailable",
          totalRequired: maxFee
            ? maxFee.add(amountInUnits).toString()
            : "unavailable",
          isInsufficient:
            maxFee && balance
              ? balance.lt(maxFee.add(amountInUnits))
              : "unavailable",
        },
      },
      `[${QUEUE_TRANSACTION}] Error`
    );
  }
});

export default transactionQueue;

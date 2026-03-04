import Queue from "bull";
import { Provider } from "fuels";
import { redisConfig } from "@/clients";
import { networks } from "@/mocks/networks";
import { QUEUE_TRANSACTION } from "./constants";
import { loadVaultConfig } from "@/queues/generateTestTx/utils/loader";
import { createVault } from "@/queues/generateTestTx/utils/vault";
import { collectWitnesses } from "@/queues/generateTestTx/utils/signer";
import { logger } from "@/config/logger";

const transactionQueue = new Queue(QUEUE_TRANSACTION, {
  redis: redisConfig,
});

transactionQueue.process(1, async (job) => {
  console.log(`[${QUEUE_TRANSACTION}] Job started`, new Date());

  try {
    const config = loadVaultConfig();
    const provider = new Provider(networks[config.network]);
    const vault = createVault(provider, config);

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
    console.log(`[${QUEUE_TRANSACTION}] Transaction created:`, hashTxId);

    const witnesses = await collectWitnesses(
      vault,
      hashTxId,
      encodedTxId,
      config.vault.signers,
      provider
    );
    console.log(
      `[${QUEUE_TRANSACTION}] Witnesses collected:`,
      witnesses.length
    );

    if (witnesses.length === 0) {
      throw new Error("[Queue] No local signers available.");
    }

    tx.witnesses = witnesses;

    const result = await vault.send(tx);
    console.log(`[${QUEUE_TRANSACTION}] TX sent, waiting for result...`);

    await result.waitForResult();
    console.log(`[${QUEUE_TRANSACTION}] TX SUCCESS`);
  } catch (error) {
    logger.error({ error }, `[${QUEUE_TRANSACTION}] Error`);
  }
});

export default transactionQueue;

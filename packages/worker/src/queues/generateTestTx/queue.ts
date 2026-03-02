import Queue from "bull";
import { Vault } from "bakosafe";
import { Provider, WalletUnlocked } from "fuels";
import { redisConfig } from "@/clients";
import { networks } from "@/mocks/networks";
import {
  QUEUE_TRANSACTION,
  VAULT_CONFIG,
  DEFAULT_AMOUNT,
  PRIVATE_KEY,
  VAULT_VERSION,
} from "./constants";
import { logger } from "@/config/logger";

const transactionQueue = new Queue(QUEUE_TRANSACTION, {
  redis: redisConfig,
});

const provider = new Provider(networks["mainnet"]);
const wallet = new WalletUnlocked(PRIVATE_KEY, provider);
const vault = new Vault(provider, VAULT_CONFIG, VAULT_VERSION);

transactionQueue.process(1, async (job) => {
  console.log(`[${QUEUE_TRANSACTION}] Job started`, new Date());
  try {
    const baseAsset = await provider.getBaseAssetId();

    const { tx, hashTxId } = await vault.transaction({
      name: "Transaction Cron",
      assets: [
        {
          to: vault.address.toB256(),
          amount: DEFAULT_AMOUNT,
          assetId: baseAsset,
        },
      ],
    });

    const signature = await wallet.signMessage(hashTxId);

    tx.witnesses = [vault.encodeSignature(wallet.address.toB256(), signature)];

    const result = await vault.send(tx);
    const response = await result.waitForResult();

    console.log("TX SUCCESS:", response.status);
  } catch (error) {
    logger.error({ error }, "[${QUEUE_TRANSACTION}] Error");
    throw error;
  }
});

export default transactionQueue;

import { MongoDatabase } from "@/clients/mongoClient";
import {
  COLLECTION_GASLESS_UTXOS,
  CLEANUP_INTERVAL_MS,
} from "@/queues/gaslessUtxos/constants";
import { GaslessUtxo } from "@/queues/gaslessUtxos/types";
import { gaslessUtxosCollection } from "@/queues/gaslessUtxos";

export class GaslessUtxoCleanup {
  private static instance?: GaslessUtxoCleanup;
  private static intervalRef?: NodeJS.Timeout;

  private constructor() {}

  static start(): GaslessUtxoCleanup {
    if (!GaslessUtxoCleanup.instance) {
      GaslessUtxoCleanup.instance = new GaslessUtxoCleanup();

      GaslessUtxoCleanup.intervalRef = setInterval(async () => {
        const db = await MongoDatabase.connect();
        const utxos = gaslessUtxosCollection(
          db.getCollection<GaslessUtxo>(COLLECTION_GASLESS_UTXOS)
        );
        const released = await utxos.releaseExpired();
        if (released > 0) {
          console.log(
            `[GASLESS_UTXO_CLEANUP]: Released ${released} expired reservation(s).`
          );
        }
      }, CLEANUP_INTERVAL_MS);
    }

    return GaslessUtxoCleanup.instance;
  }

  static stop(): void {
    if (GaslessUtxoCleanup.intervalRef) {
      clearInterval(GaslessUtxoCleanup.intervalRef);
      GaslessUtxoCleanup.intervalRef = undefined;
      console.log("[GASLESS_UTXO_CLEANUP]: Stopped.");
    }
  }
}

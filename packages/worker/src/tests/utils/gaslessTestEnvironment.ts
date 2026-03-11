import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Collection } from "mongodb";
import { GaslessUtxo } from "@/queues/gaslessUtxos";
import { COLLECTION_GASLESS_UTXOS } from "@/queues/gaslessUtxos";

export class GaslessTestEnvironment {
  private mongod!: MongoMemoryServer;
  private client!: MongoClient;
  collection!: Collection<GaslessUtxo>;

  async init(): Promise<void> {
    this.mongod = await MongoMemoryServer.create();
    const uri = this.mongod.getUri();

    this.client = new MongoClient(uri);
    await this.client.connect();

    const db = this.client.db("test");
    this.collection = db.collection<GaslessUtxo>(COLLECTION_GASLESS_UTXOS);
  }

  async close(): Promise<void> {
    await this.client.close();
    await this.mongod.stop();
  }

  async clear(): Promise<void> {
    await this.collection.deleteMany({});
  }

  async seed(utxos: Partial<GaslessUtxo>[]): Promise<void> {
    const docs = utxos.map((u) => ({
      utxoId: u.utxoId ?? "utxo-1",
      txId: u.txId ?? "0xabc",
      outputIndex: u.outputIndex ?? 0,
      amount: u.amount ?? "200000000000000",
      status: u.status ?? "available",
      createdAt: u.createdAt ?? new Date(),
      ...(u.reservedBy && { reservedBy: u.reservedBy }),
      ...(u.reservedAt && { reservedAt: u.reservedAt }),
      ...(u.spentTxHash && { spentTxHash: u.spentTxHash }),
    })) as GaslessUtxo[];

    await this.collection.insertMany(docs);
  }
}

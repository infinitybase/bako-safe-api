import { Request, Response, NextFunction } from "express";
import { MongoDatabase } from "@/clients/mongoClient";
import { gaslessUtxosCollection } from "@/queues/gaslessUtxos";
import { COLLECTION_GASLESS_UTXOS } from "@/queues/gaslessUtxos/constants";
import { GaslessUtxo } from "@/queues/gaslessUtxos/types";
import { AppError } from "@/http/middlewares/handleErrors";

export class GaslessController {
  static async reserve(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { accountId, estimatedMaxFee } = req.body;

      if (estimatedMaxFee === undefined || estimatedMaxFee === null) {
        throw new AppError(400, "estimatedMaxFee is required");
      }

      if (typeof estimatedMaxFee !== "number" || estimatedMaxFee <= 0) {
        throw new AppError(400, "estimatedMaxFee must be a positive number");
      }

      if (
        accountId !== undefined &&
        (typeof accountId !== "string" || accountId.trim().length === 0)
      ) {
        throw new AppError(400, "accountId must be a non-empty string");
      }

      const db = await MongoDatabase.connect();
      const utxos = gaslessUtxosCollection(
        db.getCollection<GaslessUtxo>(COLLECTION_GASLESS_UTXOS)
      );

      const utxo = await utxos.reserve({
        reservedBy: accountId ?? "anonymous",
        estimatedMaxFee,
      });

      if (!utxo) {
        throw new AppError(503, "POOL_EXHAUSTED");
      }

      res.status(200).json({
        utxoId: utxo.utxoId,
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        amount: utxo.amount,
        owner: utxo.owner,
      });
    } catch (err) {
      next(err);
    }
  }

  static async stats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const db = await MongoDatabase.connect();
      const utxos = gaslessUtxosCollection(
        db.getCollection<GaslessUtxo>(COLLECTION_GASLESS_UTXOS)
      );

      const stats = await utxos.getStats();

      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from "express";
import { AppError } from "@/http/middlewares/handleErrors";

export class GaslessController {
  static async reserve(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      throw new AppError(501, "Not implemented");
    } catch (err) {
      next(err);
    }
  }
}

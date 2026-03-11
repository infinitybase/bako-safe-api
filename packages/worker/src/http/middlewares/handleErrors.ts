import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export const handleErrors = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};

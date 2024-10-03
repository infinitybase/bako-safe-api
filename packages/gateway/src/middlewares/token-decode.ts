import express from "express";
import { CLITokenCoder, Database } from "@/lib";
import { AuthService } from "@/service";

export const tokenDecodeMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { api_token } = req.query;
    const tokenCoder = new CLITokenCoder("aes-256-cbc");

    const { apiToken, userId } = tokenCoder.decode(api_token as string);

    const database = await Database.connect();
    const authService = new AuthService(database);
    const { predicate } = await authService.getTokenData({ apiToken, userId });

    // @ts-ignore
    req.context = {
      userId,
      apiToken,
      database,
      provider: predicate.provider,
    };

    return next();
  } catch (e) {
    return next(e);
  }
};

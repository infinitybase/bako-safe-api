import express from "express";
import { CLITokenCoder } from "@/lib";

export const tokenDecodeMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { api_token: apiToken } = req.query;
    const tokenCoder = new CLITokenCoder("aes-256-cbc");
    const decodedToken = tokenCoder.decode(apiToken as string);

    // @ts-ignore
    req.context = {
      apiToken: decodedToken.apiToken,
      userId: decodedToken.userId,
    };

    return next();
  } catch (e) {
    return next(e);
  }
};

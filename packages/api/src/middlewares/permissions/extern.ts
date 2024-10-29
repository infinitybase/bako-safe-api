import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const { EXTERN_TOKEN_SECRET } = process.env;

export async function externAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    let authorization = req?.headers?.authorization;

    if (authorization) {
      authorization = authorization.replace('Bearer ', '');
    }

    jwt.verify(authorization, EXTERN_TOKEN_SECRET);

    return next();
  } catch (e) {
    return next(e);
  }
}

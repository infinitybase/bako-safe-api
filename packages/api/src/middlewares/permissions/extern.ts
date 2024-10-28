import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const { EXTERN_CRYPT_KEY } = process.env;

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

    jwt.verify(authorization, EXTERN_CRYPT_KEY);

    return next();
  } catch (e) {
    return next(e);
  }
}

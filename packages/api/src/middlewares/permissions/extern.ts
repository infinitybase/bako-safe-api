import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const { EXTERN_CRYPT_KEY } = process.env;

export async function externAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    let key;
    const authorization = req?.headers?.authorization;

    if (authorization) {
      key = authorization.split(' ')[1];
    }

    jwt.verify(key, EXTERN_CRYPT_KEY);

    return next();
  } catch (e) {
    return next(e);
  }
}

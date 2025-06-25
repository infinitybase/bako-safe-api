import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';

const { API_TOKEN_SECRET, API_TOKEN_SECRET_IV: API_TOKEN_IV } = process.env;

if (!API_TOKEN_SECRET) {
  throw new Error('[CONFIG] Missing env var: API_TOKEN_SECRET');
}

if (!API_TOKEN_IV) {
  throw new Error('[CONFIG] Missing env var: API_TOKEN_SECRET_IV');
}

export const API_TOKEN_SECRET_KEY = crypto
  .createHash('sha512')
  .update(API_TOKEN_SECRET)
  .digest('hex')
  .substring(0, 32);

export const API_TOKEN_SECRET_IV = crypto
  .createHash('sha512')
  .update(API_TOKEN_IV)
  .digest('hex')
  .substring(0, 16);

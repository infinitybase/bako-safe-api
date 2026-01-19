import { logger } from '@src/config/logger';

const {
  API_PORT,
  PORT,
  API_ENVIRONMENT,
  UI_URL,
  API_URL,
  FUEL_PROVIDER,
  GAS_LIMIT,
  MAX_FEE,
  COIN_MARKET_CAP_API_KEY,
  AWS_SMTP_USER,
  AWS_SMTP_PASS,
  REDIS_URL_WRITE,
  REDIS_URL_READ,
  EXTERN_TOKEN_SECRET,
} = process.env;

export const environment = async () => {
  logger.info(
    {
      API_PORT,
      PORT,
      API_ENVIRONMENT,
      UI_URL,
      API_URL,
      FUEL_PROVIDER,
      GAS_LIMIT,
      MAX_FEE,
      COIN_MARKET_CAP_API_KEY,
      AWS_SMTP_USER,
      AWS_SMTP_PASS,
      REDIS_URL_WRITE,
      REDIS_URL_READ,
      EXTERN_TOKEN_SECRET,
    },
    '[ENVIRONMENTS]',
  );
};

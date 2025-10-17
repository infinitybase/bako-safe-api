import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const {
  LAYERS_SWAP_API_URL,
  LAYERS_SWAP_API_KEY_SANDBOX,
  LAYERS_SWAP_API_KEY_PROD,
} = process.env;

if (
  !LAYERS_SWAP_API_URL ||
  !LAYERS_SWAP_API_KEY_SANDBOX ||
  !LAYERS_SWAP_API_KEY_PROD
) {
  console.warn(
    'LAYERS_SWAP_API_URL, LAYERS_SWAP_API_KEY_SANDBOX e LAYERS_SWAP_API_KEY_PROD devem estar definidos no .env',
  );
}

export type LayersSwapEnv = 'sandbox' | 'prod';

export function createLayersSwapApi(env: LayersSwapEnv) {
  const apiKey =
    env === 'sandbox' ? LAYERS_SWAP_API_KEY_SANDBOX : LAYERS_SWAP_API_KEY_PROD;

  const instance = axios.create({
    baseURL: LAYERS_SWAP_API_URL,
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'X-LS-APIKEY': apiKey,
    },
  });

  return instance;
}

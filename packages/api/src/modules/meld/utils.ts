import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const { MELD_API_URL, MELD_API_KEY } = process.env;

if (!MELD_API_URL || !MELD_API_KEY) {
  console.warn('MELD_API_URL and MELD_API_KEY must be defined in .env');
}

export const meldApi = axios.create({
  baseURL: MELD_API_URL,
  headers: {
    Authorization: `BASIC ${MELD_API_KEY}`,
    'Meld-Version': '2025-03-04',
    Accept: '*/*',
    'Content-Type': 'application/json',
  },
});

export const serviceProvidersWithFuelIntegration = ['BANXA'];
export const FIAT_CURRENCIES = ['BRL', 'USD', 'EUR'];
export const CRYPTO_CURRENCIES = ['ETH_FUEL'];

export const formatAmount = (amount: string, currency: string): string => {
  if (currency === 'BRL') {
    return amount.replace('.', '').replace(',', '.');
  }
  return amount;
};

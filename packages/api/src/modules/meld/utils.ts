import axios from 'axios';
import dotenv from 'dotenv';
import {
  IBuyCryptoRequest,
  ICreateWidgetResponse,
  IQuoteParams,
  IQuoteResponse,
  ISellCryptoRequest,
  ITransaction,
} from './types';

dotenv.config();

const { MELD_API_URL, MELD_API_KEY, MELD_ENVIRONMENT } = process.env;

if (!MELD_API_URL || !MELD_API_KEY) {
  console.warn('MELD_API_URL and MELD_API_KEY must be defined in .env');
}

export const isSandbox = MELD_ENVIRONMENT !== 'production';

export const meldApi = axios.create({
  baseURL: MELD_API_URL,
  headers: {
    Authorization: `BASIC ${MELD_API_KEY}`,
    'Meld-Version': '2025-03-04',
    Accept: '*/*',
    'Content-Type': 'application/json',
  },
});

export const FIAT_CURRENCIES = ['BRL', 'USD', 'EUR'];
export const CRYPTO_CURRENCIES = [isSandbox ? 'ETH' : 'ETH_FUEL'];

export const formatAmount = (amount: string, currency: string): string => {
  if (currency === 'BRL') {
    return amount.replace('.', '').replace(',', '.');
  }
  return amount;
};

// *
// for meld sandbox, use ETH instead of ETH_FUEL
// as they don't support ETH_FUEL in their sandbox environment
// for production, it will use ETH_FUEL as expected
// this is a temporary workaround until meld supports ETH_FUEL in sandbox
// *
export const meldEthValue = isSandbox ? 'ETH' : 'ETH_FUEL';

export const MOCK_DEPOSIT_TX_ID =
  '0x192aff0dc8540a69d4fe8652ec4419bf86fb9697f296f2de770ae610caba95d4';

// Helper functions for Meld API requests
export class MeldApi {
  static getMeldQuotes = async (payload: IQuoteParams): Promise<IQuoteResponse> => {
    const { data } = await meldApi.post<IQuoteResponse>(
      '/payments/crypto/quote',
      payload,
    );
    return data;
  };

  static createMeldWidgetSession = async (
    payload: IBuyCryptoRequest | ISellCryptoRequest,
  ): Promise<ICreateWidgetResponse> => {
    const { data } = await meldApi.post<ICreateWidgetResponse>(
      '/crypto/session/widget',
      payload,
    );
    return data;
  };

  static getMeldTransactions = async (params: { externalSessionIds?: string }) => {
    const { data } = await meldApi.get<{
      transactions: ITransaction[];
    }>('/payments/transactions', { params });
    return data;
  };
}

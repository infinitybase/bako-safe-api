import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { Network } from 'fuels';
import {
  IBuyCryptoRequest,
  ICreateWidgetResponse,
  IQuoteParams,
  IQuoteResponse,
  ISellCryptoRequest,
  ITransaction,
} from './types';

dotenv.config();

const {
  MELD_PRODUCTION_API_URL,
  MELD_PRODUCTION_API_KEY,
  MELD_SANDBOX_API_URL,
  MELD_SANDBOX_API_KEY,
} = process.env;

if (!MELD_PRODUCTION_API_URL || !MELD_PRODUCTION_API_KEY) {
  console.warn('MELD_API_URL and MELD_API_KEY must be defined in .env');
}

export const FIAT_CURRENCIES = ['BRL', 'USD', 'EUR'];
// export const CRYPTO_CURRENCIES = [isSandbox ? 'ETH' : ''];

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
export const getMeldEthValueByNetwork = (chainId: number): string =>
  chainId !== 9889 ? 'ETH' : 'ETH_FUEL';
// export const meldEthValue = isSandbox ? 'ETH' : 'ETH_FUEL';

export const MOCK_DEPOSIT_TX_ID =
  '0x192aff0dc8540a69d4fe8652ec4419bf86fb9697f296f2de770ae610caba95d4';

// Helper functions for Meld API requests
export class MeldApi {
  private _api: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    this._api = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `BASIC ${apiKey}`,
        'Meld-Version': '2025-03-04',
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
    });
  }

  public getMeldQuotes = async (payload: IQuoteParams): Promise<IQuoteResponse> => {
    const { data } = await this._api.post<IQuoteResponse>(
      '/payments/crypto/quote',
      payload,
    );
    return data;
  };

  public createMeldWidgetSession = async (
    payload: IBuyCryptoRequest | ISellCryptoRequest,
  ): Promise<ICreateWidgetResponse> => {
    const { data } = await this._api.post<ICreateWidgetResponse>(
      '/crypto/session/widget',
      payload,
    );
    return data;
  };

  public getMeldTransactions = async (params: { externalSessionIds?: string }) => {
    const { data } = await this._api.get<{
      transactions: ITransaction[];
    }>('/payments/transactions', { params });
    return data;
  };

  get api() {
    return this._api;
  }
}

export class MeldApiFactory {
  static getMeldApiByNetwork = (network: Network) => {
    const isSandbox = network.chainId !== 9889;
    const baseUrl = isSandbox ? MELD_SANDBOX_API_URL : MELD_PRODUCTION_API_URL;
    const apiKey = isSandbox ? MELD_SANDBOX_API_KEY : MELD_PRODUCTION_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error('MELD_API_URL and MELD_API_KEY must be defined in .env');
    }

    return new MeldApi(baseUrl, apiKey);
  };

  static getMeldEnviroment = (mode: 'production' | 'sandbox') => {
    if (mode === 'sandbox') {
      if (!MELD_SANDBOX_API_URL || !MELD_SANDBOX_API_KEY) {
        throw new Error(
          'MELD_SANDBOX_API_URL and MELD_SANDBOX_API_KEY must be defined in .env',
        );
      }
      return {
        baseUrl: MELD_SANDBOX_API_URL,
        apiKey: MELD_SANDBOX_API_KEY,
      };
    } else {
      if (!MELD_PRODUCTION_API_URL || !MELD_PRODUCTION_API_KEY) {
        throw new Error(
          'MELD_PRODUCTION_API_URL and MELD_PRODUCTION_API_KEY must be defined in .env',
        );
      }
      return {
        baseUrl: MELD_PRODUCTION_API_URL,
        apiKey: MELD_PRODUCTION_API_KEY,
      };
    }
  };
}

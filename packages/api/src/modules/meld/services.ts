import { ErrorTypes, Internal } from '@src/utils/error';
import { AxiosError } from 'axios';
import {
  IBuyCryptoRequest,
  ICreateWidgetResponse,
  IFiatCurrencyResponse,
  IMeldService,
  IPaymentMethodResponse,
  IPurchaseLimitsParams,
  IPurchaseLimitsResponse,
  IQuoteParams,
  IQuoteResponse,
  ISearchCountryParams,
  ISearchCountryResponse,
  ISearchCurrencyResponse,
  ISellCryptoRequest,
  IServiceProviderParams,
  IServiceProviderResponse,
} from './types';
import { meldApi } from './utils';

export default class MeldService implements IMeldService {
  /**
   * @description Returns a list of properties which meet the search criteria.
   */
  async getCountries(
    params: ISearchCountryParams,
  ): Promise<ISearchCountryResponse[]> {
    try {
      const { data } = await meldApi.get<ISearchCountryResponse[]>(
        '/service-providers/properties/countries',
        {
          params,
        },
      );
      return data;
    } catch (error) {
      throw new Internal({
        title: 'Error fetching countries from Meld API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  /**
   * @description Returns a list of properties which meet the search criteria.
   */
  async getFiatCurrencies(params: ISearchCountryParams) {
    try {
      const { data } = await meldApi.get<IFiatCurrencyResponse[]>(
        '/service-providers/properties/fiat-currencies',
        {
          params,
        },
      );
      return data;
    } catch (error) {
      throw new Internal({
        title: 'Error fetching fiat currencies from Meld API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  async getPaymentMethods(params: ISearchCountryParams) {
    try {
      const { data } = await meldApi.get<IPaymentMethodResponse[]>(
        '/service-providers/properties/payment-methods',
        {
          params,
        },
      );
      return data;
    } catch (error) {
      throw new Internal({
        title: 'Error fetching payment methods from Meld API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  /**
   * @description Returns a list of limits (minimums and maximums) in terms of fiat currencies tokens for buying crypto.
   */
  async getOnRampPurchaseLimits(
    params: IPurchaseLimitsParams,
  ): Promise<IPurchaseLimitsResponse[]> {
    try {
      const { data } = await meldApi.get<IPurchaseLimitsResponse[]>(
        '/service-providers/limits/fiat-currency-purchases',
        {
          params,
        },
      );
      return data;
    } catch (error) {
      throw new Internal({
        title: 'Error fetching purchase limits from Meld API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  /**
   * @description Returns a list of limits (minimums and maximums) in terms of fiat currencies tokens for buying crypto.
   */
  async getOffRampPurchaseLimits(
    params: IPurchaseLimitsParams,
  ): Promise<IPurchaseLimitsResponse[]> {
    try {
      const { data } = await meldApi.get<IPurchaseLimitsResponse[]>(
        '/service-providers/limits/crypto-currency-sells',
        {
          params,
        },
      );
      return data;
    } catch (error) {
      throw new Internal({
        title: 'Error fetching purchase limits from Meld API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  /**
   * @description Returns a list of properties which meet the search criteria.
   */
  async getCryptoCurrencies(params: ISearchCountryParams) {
    try {
      const { data } = await meldApi.get<ISearchCurrencyResponse[]>(
        '/service-providers/properties/crypto-currencies',
        {
          params,
        },
      );
      return data;
    } catch (error) {
      throw new Internal({
        title: 'Error fetching crypto currencies from Meld API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  async getServiceProviders(params: IServiceProviderParams) {
    try {
      const { data } = await meldApi.get<IServiceProviderResponse[]>(
        '/service-providers',
        {
          params,
        },
      );
      return data;
    } catch (error) {
      throw new Internal({
        title: 'Error fetching service providers from Meld API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  /**
   * @description Use this endpoint to request the current exchange rate of the selected fiat currency-cryptocurrency pair, and the required fees. Enter a fiat currency as the sourceCurrencyCode to buy crypto and enter a crypto currency in that field to sell crypto.
   */
  async getQuotes(payload: IQuoteParams): Promise<IQuoteResponse> {
    try {
      const { data } = await meldApi.post<IQuoteResponse>(
        '/payments/crypto/quote',
        payload,
      );
      return data;
    } catch (error) {
      console.error(error.response.data);
      throw new Internal({
        title: 'Error fetching quotes from Meld API',
        detail:
          error instanceof AxiosError
            ? error.response.data.message
            : error instanceof Error
            ? error.message
            : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  /**
   * @description Use this endpoint to create a crypto widget for a session to buy or sell crypto.
   */
  async createWidgetSession(
    request: IBuyCryptoRequest | ISellCryptoRequest,
  ): Promise<ICreateWidgetResponse> {
    try {
      const { data } = await meldApi.post<ICreateWidgetResponse>(
        '/crypto/session/widget',
        request,
      );
      return data;
    } catch (error) {
      console.error('Error creating widget session:', error.response.data);
      throw new Internal({
        title: 'Error creating widget session from Meld API',
        detail:
          error instanceof AxiosError
            ? error.response.data.message
            : error instanceof Error
            ? error.message
            : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }
}

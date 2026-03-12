import { ErrorTypes, Internal } from '@src/utils/error';
import { AxiosError } from 'axios';
import { Network } from 'fuels';
import {
  IBuyCryptoRequest,
  ICommonSearchParams,
  ICreateWidgetResponse,
  IFiatCurrencyResponse,
  IMeldService,
  IPaymentMethodResponse,
  IPurchaseLimitsParams,
  IPurchaseLimitsResponse,
  IQuoteParams,
  IQuoteResponse,
  ISearchCountryResponse,
  ISearchCurrencyResponse,
  ISellCryptoRequest,
  IServiceProviderParams,
  IServiceProviderResponse,
} from './types';
import { MeldApiFactory } from './utils';

export default class MeldService implements IMeldService {
  /**
   * @description Returns a list of properties which meet the search criteria.
   */
  async getCountries(
    params: ICommonSearchParams,
    network: Network,
  ): Promise<ISearchCountryResponse[]> {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network).api;
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
  async getFiatCurrencies(params: ICommonSearchParams, network: Network) {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network).api;
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

  async getPaymentMethods(params: ICommonSearchParams, network: Network) {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network).api;
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
    network: Network,
  ): Promise<IPurchaseLimitsResponse[]> {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network).api;
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
    network: Network,
  ): Promise<IPurchaseLimitsResponse[]> {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network).api;
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
  async getCryptoCurrencies(params: ICommonSearchParams, network: Network) {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network).api;
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

  async getServiceProviders(params: IServiceProviderParams, network: Network) {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network).api;
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
  async getQuotes(
    payload: IQuoteParams,
    network: Network,
  ): Promise<IQuoteResponse> {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network);
      return await meldApi.getMeldQuotes(payload);
    } catch (error) {
      throw new Internal({
        title: 'Error fetching quotes from Meld API',
        detail:
          error instanceof AxiosError
            ? error.response?.data?.message
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
    network: Network,
  ): Promise<ICreateWidgetResponse> {
    try {
      const meldApi = MeldApiFactory.getMeldApiByNetwork(network);
      return await meldApi.createMeldWidgetSession(request);
    } catch (error) {
      throw new Internal({
        title: 'Error creating widget session from Meld API',
        detail:
          error instanceof AxiosError
            ? error.response?.data?.message
            : error instanceof Error
            ? error.message
            : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }
}

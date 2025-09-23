import { ErrorTypes, Internal } from '@src/utils/error';
import {
  ICreateSwapApiResponse,
  ICreateSwapPayload,
  ICreateSwapResponse,
  IGetDestinationPayload,
  IGetDestinationsApiResponse,
  IGetDestinationsResponse,
  IGetLimitsApiResponse,
  IGetLimitsResponse,
  IGetQuotesApiResponse,
  IGetQuotesResponse,
  ILayersSwapService,
} from './types';
import { createLayersSwapApi, LayersSwapEnv } from './utils';
import axios, { AxiosInstance } from 'axios';
import { Network } from 'fuels';
import { networksByChainId } from '@src/constants/networks';

export class LayersSwapServiceFactory {
  static create(env: LayersSwapEnv): LayersSwapService {
    return new LayersSwapService(env);
  }

  static fromNetwork(net: Network): LayersSwapService {
    const env: LayersSwapEnv =
      networksByChainId['9889'] === net.url || net.chainId === 9889
        ? 'prod'
        : 'sandbox';
    return new LayersSwapService(env);
  }
}

export class LayersSwapService implements ILayersSwapService {
  private api: AxiosInstance;
  private env: LayersSwapEnv;

  constructor(env: LayersSwapEnv) {
    this.env = env;
    this.api = createLayersSwapApi(env);
  }

  private withVersion(path: string): string {
    if (this.env === 'sandbox') {
      return path.includes('?')
        ? `${path}&version=sandbox`
        : `${path}?version=sandbox`;
    }
    return path;
  }

  async getDestinations(
    payload: IGetDestinationPayload,
  ): Promise<IGetDestinationsResponse[]> {
    const { from_network, from_token } = payload;
    try {
      const { data: response } = await this.api.get<IGetDestinationsApiResponse>(
        this.withVersion(
          `/destinations?source_network=${from_network}&source_token=${from_token}`,
        ),
      );

      return response.data.map(network => ({
        name: network.name,
        display_name: network.display_name,
        logo: network.logo,
        tokens: network.tokens.map(token => ({
          symbol: token.symbol,
          logo: token.logo,
          decimals: token.decimals,
        })),
      }));
    } catch (error) {
      throw new Internal({
        title: 'Error fetching destinations from LayersSwap API',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  async getLimits(payload: ICreateSwapPayload): Promise<IGetLimitsResponse> {
    const params = new URLSearchParams({
      source_network: payload.source_network,
      source_token: payload.source_token,
      destination_network: payload.destination_network,
      destination_token: payload.destination_token,
    });

    try {
      const { data } = await this.api.get<IGetLimitsApiResponse>(
        this.withVersion(`/limits?${params.toString()}`),
      );

      return data.data;
    } catch (error) {
      const isAxiosErr = axios.isAxiosError(error);
      const detail =
        (isAxiosErr ? error.response?.data?.error?.message : null) ||
        (error instanceof Error ? error.message : 'Unknown error');

      throw new Internal({
        title: 'Error fetching limits from LayersSwap API',
        detail,
        type: ErrorTypes.Internal,
      });
    }
  }

  async getQuotes(payload: ICreateSwapPayload): Promise<IGetQuotesResponse> {
    const params = new URLSearchParams({
      source_network: payload.source_network,
      source_token: payload.source_token,
      destination_network: payload.destination_network,
      destination_token: payload.destination_token,
      amount: payload.amount.toString(),
    });

    try {
      const { data } = await this.api.get<IGetQuotesApiResponse>(
        this.withVersion(`/quote?${params.toString()}`),
      );

      return data.data;
    } catch (error) {
      const isAxiosErr = axios.isAxiosError(error);
      const detail =
        (isAxiosErr ? error.response?.data?.error?.message : null) ||
        (error instanceof Error ? error.message : 'Unknown error');

      throw new Internal({
        title: 'Error fetching quotes from LayersSwap API',
        detail,
        type: ErrorTypes.Internal,
      });
    }
  }

  async createSwap(payload: ICreateSwapPayload): Promise<ICreateSwapResponse> {
    try {
      const { data } = await this.api.post<ICreateSwapApiResponse>(
        this.withVersion(`/swaps`),
        payload,
      );

      return data.data;
    } catch (error) {
      const isAxiosErr = axios.isAxiosError(error);
      const detail =
        (isAxiosErr ? error.response?.data?.error?.message : null) ||
        (error instanceof Error ? error.message : 'Unknown error');

      throw new Internal({
        title: 'Error create swap LayersSwap API',
        detail,
        type: ErrorTypes.Internal,
      });
    }
  }
}

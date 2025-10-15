import {
  ErrorTypes,
  Internal,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';
import {
  ICreateBridgeTransactionPayload,
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
  IInfoBridgeSwap,
  ILayersSwapService,
  ISwapResponse,
} from './types';
import { createLayersSwapApi, LayersSwapEnv } from './utils';
import axios, { AxiosInstance } from 'axios';
import {
  getTransactionSummaryFromRequest,
  Network,
  transactionRequestify,
} from 'fuels';
import { networksByChainId } from '@src/constants/networks';
import { keysToCamel } from '@src/utils/toCamelCase';
import { ITransaction } from '../meld/types';
import {
  Predicate,
  Transaction,
  TransactionStatus,
  TransactionType,
  TransactionTypeBridge,
} from '@src/models';
import { FuelProvider, generateWitnessesUpdatedAt } from '@src/utils';
import { ICreateTransactionPayload } from '../transaction/types';
import { randomUUID } from 'crypto';
import { WitnessStatus } from 'bakosafe';
import { TransactionService } from '../transaction/services';
import { tokensIDS } from '@src/utils/assets-token/addresses';

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
    const { fromNetwork, fromToken } = payload;
    try {
      const { data: response } = await this.api.get<IGetDestinationsApiResponse>(
        this.withVersion(
          `/destinations?source_network=${fromNetwork}&source_token=${fromToken}&include_swaps=${true}&include_unmatched=${true}`,
        ),
      );

      const optimisNet = response.data.find(
        network => network.name === 'OPTIMISM_MAINNET',
      );

      return response.data.map(network => ({
        name: network.name,
        displayName: network.display_name,
        logo: network.logo,
        tokens: network.tokens
          .filter(token => token.status === 'active')
          .map(token => ({
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
      source_network: payload.sourceNetwork,
      source_token: payload.sourceToken,
      destination_network: payload.destinationNetwork,
      destination_token: payload.destinationToken,
    });

    try {
      const { data } = await this.api.get<IGetLimitsApiResponse>(
        this.withVersion(`/limits?${params.toString()}`),
      );

      return {
        minAmountInUsd: data.data.min_amount_in_usd,
        minAmount: data.data.min_amount,
        maxAmountInUsd: data.data.max_amount_in_usd,
        maxAmount: data.data.max_amount,
      };
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
      source_network: payload.sourceNetwork,
      source_token: payload.sourceToken,
      destination_network: payload.destinationNetwork,
      destination_token: payload.destinationToken,
      amount: payload.amount.toString(),
    });

    try {
      const { data } = await this.api.get<IGetQuotesApiResponse>(
        this.withVersion(`/quote?${params.toString()}`),
      );

      return keysToCamel<IGetQuotesResponse>(data.data);
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
      const payloadToApi = {
        destination_address: payload.destinationAddress,
        source_network: payload.sourceNetwork,
        source_token: payload.sourceToken,
        destination_network: payload.destinationNetwork,
        destination_token: payload.destinationToken,
        amount: payload.amount,
        refuel: payload.refuel,
        use_deposit_address: payload.useDepositAddress,
        use_new_deposit_address: payload.useNewDepositAddress,
        reference_id: payload.referenceId,
        slippage: payload.slippage,
        refund_address: payload.sourceAddress,
      };

      const { data } = await this.api.post<ICreateSwapApiResponse>(
        this.withVersion(`/swaps`),
        payloadToApi,
      );

      return keysToCamel<ICreateSwapResponse>(data.data);
    } catch (error) {
      const isAxiosErr = axios.isAxiosError(error);
      const detail =
        (isAxiosErr ? error.response?.data?.error?.message : null) ||
        (error instanceof Error ? error.message : 'Unknown error');

      const errorTitle = 'Error create swap LayersSwap API';
      const title = detail.includes('Invalid address')
        ? `${errorTitle} - Invalid address`
        : errorTitle;

      throw new Internal({
        title,
        detail,
        type: ErrorTypes.Internal,
      });
    }
  }

  async createBridgeTransaction(
    payload: ICreateBridgeTransactionPayload,
  ): Promise<Transaction> {
    try {
      const { swap, txData, name, network, user } = payload;

      const swapData = swap.swap;

      const predicate = await Predicate.findOneOrFail({
        where: { predicateAddress: swap.sourceAddress },
        relations: { members: true, owner: true },
      });

      const validUser =
        user.id === predicate.owner.id ||
        predicate.members.some(m => m.id === user.id);

      if (!validUser) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.UNAUTHORIZED_RESOURCE,
          detail: 'The provided resource is unauthorized',
        });
      }

      const config = JSON.parse(predicate.configurable);

      const txSummary = await getTransactionSummaryFromRequest({
        transactionRequest: transactionRequestify(txData),
        provider: await FuelProvider.create(network.url),
      });

      const witnesses = predicate.members.map(member => ({
        account: member.address,
        status: WitnessStatus.PENDING,
        signature: null,
        updatedAt: generateWitnessesUpdatedAt(),
      }));

      const depositActions = swapData.depositActions[0];
      const quote = swapData.quote;
      const defaultDecimals = 9;
      const isAssetToEth = swap.destinationAsset === tokensIDS.ETH;

      const swapInfo: IInfoBridgeSwap = {
        id: swapData.swap.id,
        createdDate: swapData.swap.createdDate,
        sourceNetwork: swapData.swap.sourceNetwork,
        sourceAddress: swap.sourceAddress,
        sourceToken: {
          assetId: swap.sourceAsset,
          amount: swapData.swap.requestedAmount,
          to: depositActions.toAddress,
          decimals: swapData?.swap?.sourceToken?.decimals ?? defaultDecimals,
        },
        destinationNetwork: swapData.swap.destinationNetwork,
        destinationToken: {
          assetId: swap.destinationAsset,
          amount: quote.receiveAmount,
          to: swapData.swap.destinationAddress,
          decimals: isAssetToEth
            ? defaultDecimals
            : swapData?.swap?.destinationToken?.decimals ?? defaultDecimals,
        },
        status: swapData.swap.status,
      };

      const txPayload: ICreateTransactionPayload = {
        name:
          name ??
          `Bridge ${swapData.swap.sourceNetwork.name} to ${swapData.swap.destinationNetwork.name}`,
        predicateAddress: swap.sourceAddress,
        hash: txSummary.id.slice(2),
        txData,
        status: TransactionStatus.AWAIT_REQUIREMENTS,
        resume: {
          hash: txSummary.id,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
          witnesses,
          requiredSigners: config.SIGNATURES_COUNT ?? 1,
          totalSigners: predicate.members.length,
          predicate: {
            id: predicate.id,
            address: predicate.predicateAddress,
          },
          id: txSummary.id,
          // @ts-expect-error not defined in resume type
          bridge: swapInfo,
        },
        type: TransactionTypeBridge.BRIDGE,
        createdBy: user,
        // @ts-expect-error - no summary.type for this transaction
        summary: { operations: txSummary.operations },
        network,
        predicate,
      };

      const transaction = await Transaction.create(txPayload)
        .save()
        .then(res => res)
        .catch(err => {
          throw new Internal({
            title: 'Error creating transaction',
            detail: err instanceof Error ? err.message : 'Unknown error',
            type: ErrorTypes.Internal,
          });
        });

      return transaction;
    } catch (error) {
      console.log('>>> error >>>', error);
      const isAxiosErr = axios.isAxiosError(error);
      const detail =
        (isAxiosErr ? error.response?.data?.error?.message : null) ||
        (error instanceof Error ? error.message : 'Unknown error');

      if (error instanceof Unauthorized) {
        throw error;
      }

      throw new Internal({
        title: 'Error create bridge transaction LayersSwap API',
        detail,
        type: ErrorTypes.Internal,
      });
    }
  }
}

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { ITransaction } from '../meld/types';
import { Transaction } from '@src/models';

export interface ErrorResponse {
  code: string;
  message: string;
  metadata: {
    additionalProp1: string;
    additionalProp2: string;
    additionalProp3: string;
  };
}

export interface TokenLayersSwapApi {
  symbol: string;
  display_asset: string;
  logo: string;
  contract: string;
  decimals: number;
  price_in_usd: number;
  precision: number;
  listing_date: Date;
  source_rank: number;
  destination_rank: number;
}

export interface MetadataDestinationApi {
  listing_date: Date;
  evm_oracle_contract: string;
  evm_multicall_contract: string;
  zks_paymaster_contract: string;
  watchdog_contract: string;
}

export interface INetworkLayersSwapApi {
  name: string;
  display_name: string;
  logo: string;
  chain_id: string;
  node_url: string;
  type: 'evm';
  transaction_explorer_template: string;
  account_explorer_template: string;
  source_rank: 0;
  destination_rank: 0;
  token: TokenLayersSwapApi;
  metadata: MetadataDestinationApi;
  deposit_methods: string[];
}

export interface TokenLayersSwap {
  symbol: string;
  displayAsset: string;
  logo: string;
  contract: string;
  decimals: number;
  priceInUsd: number;
  precision: number;
  listingDate: Date;
  sourceRank: number;
  destinationRank: number;
}

export interface MetadataDestination {
  listingDate: Date;
  evmOracleContract: string;
  evmMulticallContract: string;
  zksPaymasterContract: string;
  watchdogContract: string;
}

export interface INetworkLayersSwap {
  name: string;
  displayName: string;
  logo: string;
  chainId: string;
  nodeUrl: string;
  type: 'evm';
  transactionExplorerTemplate: string;
  accountExplorerTemplate: string;
  sourceRank: number;
  destinationRank: number;
  token: TokenLayersSwap;
  metadata: MetadataDestination;
  depositMethods: string[];
}

export interface IGetDestinationPayload {
  fromNetwork: string;
  fromToken: string;
}

export interface ICreateSwapPayload {
  destinationAddress: string;
  sourceNetwork: string;
  sourceToken: string;
  destinationNetwork: string;
  destinationToken: string;
  amount?: number;
  refuel?: boolean;
  useDepositAddress?: boolean;
  useNewDepositAddress?: null;
  referenceId?: null;
  sourceAddress?: null;
  slippage?: null;
}

export interface IGetDestinationsResponse {
  name: string;
  displayName: string;
  logo: string;
  tokens: {
    symbol: string;
    logo: string;
    decimals: number;
  }[];
}

export interface IGetDestinationsApiResponse {
  error: ErrorResponse;
  data: [
    {
      name: string;
      display_name: string;
      logo: string;
      chain_id: string;
      node_url: string;
      type: 'evm';
      transaction_explorer_template: string;
      account_explorer_template: string;
      source_rank: number;
      destination_rank: number;
      token: TokenLayersSwap;
      metadata: MetadataDestination;
      deposit_methods: string[];
      tokens: [
        {
          symbol: string;
          display_asset: string;
          logo: string;
          contract: string;
          decimals: number;
          price_in_usd: number;
          precision: number;
          listing_date: Date;
          source_rank: number;
          destination_rank: number;
          status: string;
          refuel: {
            token: TokenLayersSwap;
            network: INetworkLayersSwap;
            amount: number;
            amount_in_usd: number;
          };
        },
      ];
    },
  ];
}

export interface IInfoBridgeSwap {
  id: string;
  createdDate: Date;
  sourceNetwork: INetworkLayersSwap;
  sourceToken: {
    assetId: string;
    amount: number;
    to: string;
    decimals: number;
  };
  destinationNetwork: INetworkLayersSwap;
  destinationToken: {
    assetId: string;
    amount: number;
    to: string;
    decimals: number;
  };
  status: string;
}

export interface ISwapResponse {
  id: string;
  createdDate: Date;
  sourceNetwork: INetworkLayersSwap;
  sourceToken: TokenLayersSwap;
  sourceExchange: {
    name: string;
    displayName: string;
    logo: string;
    metadata: {
      oauth: {
        authorizeUrl: string;
        connectUrl: string;
      };
      listingDate: Date;
    };
  };
  destinationNetwork: INetworkLayersSwap;
  destinationToken: TokenLayersSwap;
  destinationExchange: {
    name: string;
    displayName: string;
    logo: string;
    metadata: {
      oauth: {
        authorizeUrl: string;
        connectUrl: string;
      };
      listingDate: Date;
    };
  };
  requestedAmount: number;
  destinationAddress: string;
  status: string;
  failReason: string;
  useDepositAddress: boolean;
  metadata: {
    sequenceNumber: number;
    referenceId: string;
    exchangeAccount: string;
  };
  transactions: [
    {
      from: string;
      to: string;
      timestamp: Date;
      transactionHash: string;
      confirmations: number;
      maxConfirmations: number;
      amount: number;
      type: string;
      status: string;
      token: TokenLayersSwap;
      network: INetworkLayersSwap;
      feeAmount: number;
      feeToken: TokenLayersSwap;
    },
  ];
}

export interface ICreateSwapResponse {
  quote: {
    totalFee: number;
    totalFeeInUsd: number;
    sourceNetwork: INetworkLayersSwap;
    sourceToken: TokenLayersSwap;
    destinationNetwork: INetworkLayersSwap;
    destinationToken: TokenLayersSwap;
    requestedAmount: number;
    receiveAmount: number;
    feeDiscount: number;
    minReceiveAmount: number;
    blockchainFee: number;
    serviceFee: number;
    avgCompletionTime: string;
    refuelInSource: number;
    slippage: number;
  };
  refuel: {
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amountInUsd: number;
  };
  reward: {
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amountInUsd: number;
    campaignType: string;
    nftContractAddress: string;
  };
  swap: ISwapResponse;
  depositActions: [
    {
      type: string;
      toAddress: string;
      amount: number;
      order: number;
      amountInBaseUnits: string;
      network: INetworkLayersSwap;
      token: TokenLayersSwap;
      feeToken: TokenLayersSwap;
      callData: string;
    },
  ];
}

export interface ICreateSwapApiResponse {
  error: ErrorResponse;
  data: {
    quote: {
      total_fee: number;
      total_fee_in_usd: number;
      source_network: INetworkLayersSwapApi;
      source_token: TokenLayersSwapApi;
      destination_network: INetworkLayersSwapApi;
      destination_token: TokenLayersSwapApi;
      requested_amount: number;
      receive_amount: number;
      fee_discount: number;
      min_receive_amount: number;
      blockchain_fee: number;
      service_fee: number;
      avg_completion_time: string;
      refuel_in_source: number;
      slippage: number;
    };
    refuel: {
      token: TokenLayersSwapApi;
      network: INetworkLayersSwapApi;
      amount: number;
      amount_in_usd: number;
    };
    reward: {
      token: TokenLayersSwapApi;
      network: INetworkLayersSwapApi;
      amount: number;
      amount_in_usd: number;
      campaign_type: string;
      nft_contract_address: string;
    };
    swap: ISwapResponse;
    deposit_actions: [
      {
        type: string;
        to_address: string;
        amount: number;
        order: number;
        amount_in_base_units: string;
        network: INetworkLayersSwapApi;
        token: TokenLayersSwapApi;
        fee_token: TokenLayersSwapApi;
        call_data: string;
      },
    ];
  };
}

export interface IGetQuotesApiResponse {
  error: ErrorResponse;
  data: {
    quote: {
      total_fee: number;
      total_fee_in_usd: number;
      source_network: INetworkLayersSwapApi;
      source_token: TokenLayersSwapApi;
      destination_network: INetworkLayersSwapApi;
      destination_token: TokenLayersSwapApi;
      requested_amount: number;
      receive_amount: number;
      fee_discount: number;
      min_receive_amount: number;
      blockchain_fee: number;
      service_fee: number;
      avg_completion_time: string;
      refuel_in_source: number;
      slippage: number;
    };
    refuel: {
      token: TokenLayersSwapApi;
      network: INetworkLayersSwapApi;
      amount: number;
      amount_in_usd: number;
    };
    reward: {
      token: TokenLayersSwapApi;
      network: INetworkLayersSwapApi;
      amount: number;
      amount_in_usd: number;
      campaign_type: string;
      nft_contract_address: string;
    };
  };
}

export interface IGetQuotesResponse {
  quote: {
    totalFee: number;
    totalFeeInUsd: number;
    sourceNetwork: INetworkLayersSwap;
    sourceToken: TokenLayersSwap;
    destinationNetwork: INetworkLayersSwap;
    destinationToken: TokenLayersSwap;
    requestedAmount: number;
    receiveAmount: number;
    feeDiscount: number;
    minReceiveAmount: number;
    blockchainFee: number;
    serviceFee: number;
    avgCompletionTime: string;
    refuelInSource: number;
    slippage: number;
  };
  refuel: {
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amountInUsd: number;
  };
  reward: {
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amountInUsd: number;
    campaignType: string;
    nftContractAddress: string;
  };
}

export interface IGetLimitsResponse {
  minAmountInUsd: number;
  minAmount: number;
  maxAmountInUsd: number;
  maxAmount: number;
}

export interface IGetLimitsApiResponse {
  error: ErrorResponse;
  data: {
    min_amount_in_usd: number;
    min_amount: number;
    max_amount_in_usd: number;
    max_amount: number;
  };
}

export interface ILayersSwapService {
  getDestinations(
    payload: IGetDestinationPayload,
  ): Promise<IGetDestinationsResponse[]>;
  getLimits(payload: ICreateSwapPayload): Promise<IGetLimitsResponse>;
  getQuotes(payload: ICreateSwapPayload): Promise<IGetQuotesResponse>;
  createSwap(payload: ICreateSwapPayload): Promise<ICreateSwapResponse>;
  updateSwapTransaction(
    hash: string,
    payload: IInfoBridgeSwap,
  ): Promise<Transaction>;
}

interface IGetDestinationRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: IGetDestinationPayload;
}

interface IGetLimitsRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: ICreateSwapPayload;
}

interface IGetQuoteRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: ICreateSwapPayload;
}

interface ICreateSwapRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICreateSwapPayload;
}

interface IUpdateSwapRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { hash: string };
  [ContainerTypes.Body]: IInfoBridgeSwap;
}

export type IRequestDestination = AuthValidatedRequest<IGetDestinationRequestSchema>;
export type IRequestLimits = AuthValidatedRequest<IGetLimitsRequestSchema>;
export type IRequestQuote = AuthValidatedRequest<IGetQuoteRequestSchema>;
export type IRequestCreateSwap = AuthValidatedRequest<ICreateSwapRequestSchema>;
export type IRequestUpdateSwap = AuthValidatedRequest<IUpdateSwapRequestSchema>;

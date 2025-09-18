import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { LayersSwapEnv } from './utils';

export interface ErrorResponse {
  code: string;
  message: string;
  metadata: {
    additionalProp1: string;
    additionalProp2: string;
    additionalProp3: string;
  };
}

export interface TokenLayersSwap {
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

export interface MetadataDestination {
  listing_date: Date;
  evm_oracle_contract: string;
  evm_multicall_contract: string;
  zks_paymaster_contract: string;
  watchdog_contract: string;
}

export interface INetworkLayersSwap {
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
  token: TokenLayersSwap;
  metadata: MetadataDestination;
  deposit_methods: ['string'];
}

export interface IGetDestinationPayload {
  from_network: string;
  from_token: string;
}

export interface ICreateSwapPayload {
  destination_address: string; //'0x0b9554fC251Be0E3eb2B61266e827824Ac49f66347629c4dc9C440de5752a992';
  source_network: string; //'ETHEREUM_MAINNET';
  source_token: string; //'ETH';
  destination_network: string; //'FUEL_MAINNET';
  destination_token: string; //'ETH';
  amount?: number;
  refuel?: boolean;
  use_deposit_address?: boolean;
  use_new_deposit_address?: null;
  reference_id?: null;
  source_address?: null;
  slippage?: null;
}

export interface IGetDestinationsResponse {
  name: string;
  display_name: string;
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
      deposit_methods: ['string'];
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

export interface ICreateSwapResponse {
  quote: {
    total_fee: number;
    total_fee_in_usd: number;
    source_network: INetworkLayersSwap;
    source_token: TokenLayersSwap;
    destination_network: INetworkLayersSwap;
    destination_token: TokenLayersSwap;
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
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amount_in_usd: number;
  };
  reward: {
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amount_in_usd: number;
    campaign_type: string;
    nft_contract_address: string;
  };
  swap: {
    id: string;
    created_date: Date;
    source_network: INetworkLayersSwap;
    source_token: TokenLayersSwap;
    source_exchange: {
      name: string;
      display_name: string;
      logo: string;
      metadata: {
        oauth: {
          authorize_url: string;
          connect_url: string;
        };
        listing_date: Date;
      };
    };
    destination_network: INetworkLayersSwap;
    destination_token: TokenLayersSwap;
    destination_exchange: {
      name: string;
      display_name: string;
      logo: string;
      metadata: {
        oauth: {
          authorize_url: string;
          connect_url: string;
        };
        listing_date: Date;
      };
    };
    requested_amount: number;
    destination_address: string;
    status: string;
    fail_reason: string;
    use_deposit_address: boolean;
    metadata: {
      sequence_number: number;
      reference_id: string;
      exchange_account: string;
    };
    transactions: [
      {
        from: string;
        to: string;
        timestamp: Date;
        transaction_hash: string;
        confirmations: number;
        max_confirmations: number;
        amount: number;
        type: string;
        status: string;
        token: TokenLayersSwap;
        network: INetworkLayersSwap;
        fee_amount: number;
        fee_token: TokenLayersSwap;
      },
    ];
  };
  deposit_actions: [
    {
      type: string;
      to_address: string;
      amount: number;
      order: number;
      amount_in_base_units: string;
      network: INetworkLayersSwap;
      token: TokenLayersSwap;
      fee_token: TokenLayersSwap;
      call_data: string;
    },
  ];
}

export interface ICreateSwapApiResponse {
  error: ErrorResponse;
  data: ICreateSwapResponse;
}

export interface IGetQuotesResponse {
  quote: {
    total_fee: number;
    total_fee_in_usd: number;
    source_network: INetworkLayersSwap;
    source_token: TokenLayersSwap;
    destination_network: INetworkLayersSwap;
    destination_token: TokenLayersSwap;
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
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amount_in_usd: number;
  };
  reward: {
    token: TokenLayersSwap;
    network: INetworkLayersSwap;
    amount: number;
    amount_in_usd: number;
    campaign_type: string;
    nft_contract_address: string;
  };
}

export interface IGetQuotesApiResponse {
  error: ErrorResponse;
  data: IGetQuotesResponse;
}

export interface IGetLimitsResponse {
  min_amount_in_usd: number;
  min_amount: number;
  max_amount_in_usd: number;
  max_amount: number;
}

export interface IGetLimitsApiResponse {
  error: ErrorResponse;
  data: IGetLimitsResponse;
}

export interface ILayersSwapService {
  getDestinations(
    payload: IGetDestinationPayload,
  ): Promise<IGetDestinationsResponse[]>;
  getLimits(payload: ICreateSwapPayload): Promise<IGetLimitsResponse>;
  getQuotes(payload: ICreateSwapPayload): Promise<IGetQuotesResponse>;
  createSwap(payload: ICreateSwapPayload): Promise<ICreateSwapResponse>;
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

export type IRequestDestination = AuthValidatedRequest<IGetDestinationRequestSchema>;
export type IRequestLimits = AuthValidatedRequest<IGetLimitsRequestSchema>;
export type IRequestQuote = AuthValidatedRequest<IGetQuoteRequestSchema>;
export type IRequestCreateSwap = AuthValidatedRequest<ICreateSwapRequestSchema>;

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { User } from '@src/models';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

export interface IBuyCryptoRequest {
  sessionData: {
    countryCode: string;
    destinationCurrencyCode: string;
    institutionId?: string;
    lockFields?: string[];
    paymentMethodType?: string;
    redirectUrl?: string;
    serviceProvider: string;
    sourceCurrencyCode: string;
    sourceAmount: string;
    walletAddress: string;
    walletTag?: string;
  };
  sessionType: 'BUY';
}

export interface ISellCryptoRequest {
  customerId?: string;
  externalCustomerId?: string;
  externalSessionId?: string;
  sessionData: {
    countryCode: string;
    destinationCurrencyCode: string;
    lockFields?: string[];
    paymentMethodType?: string;
    redirectUrl?: string;
    redirectFlow?: boolean;
    serviceProvider: string;
    sourceAmount: string;
    sourceCurrencyCode: string;
    walletAddress?: string;
    walletTag?: string;
  };
  sessionType: 'SELL';
}

export interface ICreateWidgetResponse {
  id: string;
  token: string;
  widgetUrl: string;
  externalSessionId: string;
  externalCustomerId: string;
  customerId: string;
}

export interface IPaymentMethodResponse {
  paymentMethod: string;
  name: string;
  paymentType: string;
  logos: {
    dark: string;
    light: string;
  };
}

export interface ICommonSearchParams {
  serviceProviders?: string;
  statuses?: 'LIVE' | 'RECENTLY_ADDED' | 'BUILDING';
  categories?: string;
  accountFilter: boolean;
  countries?: string;
  fiatCurrencies?: string;
  cryptoChains?: string;
  cryptoCurrencies?: string;
  paymentMethodTypes?: string;
  includeServiceProviderDetails?: boolean;
}

export interface ISearchCountryResponse {
  countryCode: string;
  flagImageUrl: string;
  name: string;
  regions?: {
    name: string;
    regionCode: string;
  }[];
  serviceProviderDetails?: Record<string, unknown>;
}

export interface IFiatCurrencyResponse {
  name: string;
  symbolImageUrl: string;
  currencyCode: string;
}

export interface ISearchCurrencyResponse {
  currencyCode: string;
  symbolImageUrl: string;
  name: string;
  chainName: string;
  chainCode: string;
}

export interface IServiceProviderParams {
  serviceProviders?: string;
  accountFilter: boolean;
}

export interface IServiceProviderResponse {
  serviceProvider: string;
  name: string;
  status: string;
  categories: string[];
  categoryStatuses: {
    CRYPTO_OFFRAMP: string;
    CRYPTO_ONRAMP: string;
  };
  websiteUrl: string;
  customerSupportUrl: string;
  logos: {
    dark: string;
    light: string;
    darkShort: string;
    lightShort: string;
  };
}

export interface IPurchaseLimitsParams {
  serviceProviders?: string;
  statuses?: 'LIVE' | 'RECENTLY_ADDED' | 'BUILDING';
  categories?: string;
  accountFilter: boolean;
  countries?: string;
  fiatCurrencies?: string;
  cryptoChains?: string;
  cryptoCurrencies?: string;
  paymentMethodTypes?: string;
  includeDetails?: boolean;
}

export interface IPurchaseLimitsResponse {
  accountDetails?: Record<string, unknown>;
  currencyCode: string;
  defaultAmount: number;
  maximumAmount: number;
  meldDetails?: Record<string, unknown>;
  minimumAmount: number;
  serviceProviderDetails?: Record<string, unknown>;
}

export type IQuoteParams = {
  countryCode: string;
  destinationCurrencyCode: string;
  customerId?: string;
  externalCustomerId?: string;
  paymentMethodType?: string;
  serviceProviders?: string[];
  sourceAmount: number;
  sourceCurrencyCode: string;
  subdivision?: string;
  walletAddress?: string;
};

export interface IQuote {
  countryCode: string;
  customerScore: number;
  destinationAmount: number;
  destinationAmountWithoutFees: number;
  destinationCurrencyCode: string;
  exchangeRate: number;
  fiatAmountWithoutFees: number;
  institutionName: string;
  lowKyc: boolean;
  networkFee: number;
  partnerFee: number;
  paymentMethodType: string;
  serviceProvider: string;
  sourceAmount: number;
  sourceAmountWithoutFees: number;
  sourceCurrencyCode: string;
  totalFee: number;
  transactionFee: number;
  transactionType: string;
}

export interface IQuoteResponse {
  message?: string;
  error?: unknown;
  quotes: IQuote[];
}

export interface ITransaction {
  accountId?: string;
  countryCode?: string;
  createdAt: string;
  cryptoDetails: {
    blockchainTransactionId: string;
    chainId: string;
    destinationWalletAddress: string;
    institution: string;
    networkFee: number;
    networkFeeInUsd: number;
    partnerFee: number;
    partnerFeeInUsd: number;
    sessionWalletAddress: string;
    sourceWalletAddress: string;
    totalFee: number;
    totalFeeInUsd: number;
    transactionFee: number;
    transactionFeeInUsd: number;
  };
  customer: {
    accountId: string;
    address: {
      addressDetails: {
        city: string;
        country: string;
        firstName: string;
        lastName: string;
        lineOne: string;
        lineTwo: string;
        postalCode: string;
        region: string;
      };
      type: 'BILLING' | 'SHIPPING' | 'RESIDENCE';
    };
    email: string;
    externalId: string;
    id: string;
    name: {
      firstName: string;
      lastName: string;
    };
    phone: string;
    serviceProviders: Record<string, string>;
    status: 'ACTIVE' | 'INACTIVE';
  };
  description: string;
  destinationAmount: number;
  destinationCurrencyCode: string;
  externalCustomerId: string;
  externalReferenceId: string;
  externalSessionId: string;
  fiatAmountInUsd: number;
  id: string;
  isImported: boolean;
  isPassthrough: boolean;
  key: string;
  serviceProvider: string;
  sessionId: string;
  status: string;
  sourceAmount?: number;
  sourceCurrencyCode?: string;
  transactionType: string;
  updatedAt: string;
}

export type IMeldTransactionResponse = {
  transaction: ITransaction;
};

export interface IMeldTransactionCryptoWeebhook {
  eventType: string;
  eventId: string;
  timestamp: string;
  accountId: string;
  version: string;
  payload: {
    accountId: string;
    paymentTransactionId: string;
    customerId?: string;
    externalCustomerId?: string;
    externalSessionId?: string;
    paymentTransactionStatus: 'PENDING' | 'SETTLING' | 'SETTLED' | 'ERROR';
  };
}

export interface IMeldWidgetSessionData {
  id: string;
  token: string;
  widgetUrl: string;
  externalSessionId: string;
  externalCustomerId: string;
  customerId: string;
}

export interface IMeldProviderData {
  widgetSessionData: IMeldWidgetSessionData;
  transactionData?: ITransaction;
  paymentStatus: string;
}

export interface IMeldPayload {
  externalSessionId: string;
  sessionId: string;
  user: User;
  widgetSessionData: IMeldWidgetSessionData;
  transactionData: unknown;
  paymentStatus?: string;
}

export interface IMeldService {
  getCountries: (params: ICommonSearchParams) => Promise<ISearchCountryResponse[]>;
  getFiatCurrencies: (
    params: ICommonSearchParams,
  ) => Promise<IFiatCurrencyResponse[]>;
  getPaymentMethods: (
    params: ICommonSearchParams,
  ) => Promise<IPaymentMethodResponse[]>;
  getOnRampPurchaseLimits: (
    params: IPurchaseLimitsParams,
  ) => Promise<IPurchaseLimitsResponse[]>;
  getOffRampPurchaseLimits: (
    params: IPurchaseLimitsParams,
  ) => Promise<IPurchaseLimitsResponse[]>;
  getCryptoCurrencies: (
    params: ICommonSearchParams,
  ) => Promise<ISearchCurrencyResponse[]>;
  getServiceProviders: (
    params: IServiceProviderParams,
  ) => Promise<IServiceProviderResponse[]>;
  getQuotes: (params: IQuoteParams) => Promise<IQuoteResponse>;
  createWidgetSession: (
    request: IBuyCryptoRequest | ISellCryptoRequest,
  ) => Promise<ICreateWidgetResponse>;
}

interface IGetQuoteRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IQuoteParams;
}

interface ICreateWidgetSessionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    type: 'BUY' | 'SELL';
    countryCode: string;
    destinationCurrencyCode: string;
    serviceProvider: string;
    sourceCurrencyCode: string;
    sourceAmount: string;
    walletAddress?: string;
  };
}

export type IRequestQuote = AuthValidatedRequest<IGetQuoteRequestSchema>;
export type IRequestCreateWidgetSession = AuthValidatedRequest<ICreateWidgetSessionRequestSchema>;

import { IAuthRequest } from '@src/middlewares/auth/types';
import { RampTransactionProvider } from '@src/models/RampTransactions';
import { bindMethods, Responses, successful } from '@src/utils';
import { error } from '@src/utils/error';
import { IRampTransactionService } from '../rampTransactions/types';
import { IMeldService, IRequestCreateWidgetSession, IRequestQuote } from './types';
import { FIAT_CURRENCIES, formatAmount, getMeldEthValueByNetwork } from './utils';

export default class MeldController {
  constructor(
    private _service: IMeldService,
    private _rampService: IRampTransactionService,
  ) {
    bindMethods(this);
  }

  async getCountries(req: IAuthRequest) {
    try {
      const network = req.network;
      const cryptoCurrency = getMeldEthValueByNetwork(network.chainId);
      const countries = await this._service.getCountries(
        {
          accountFilter: true,
          cryptoCurrencies: cryptoCurrency,
        },
        network,
      );
      return successful(countries, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getFiatCurrencies(req: IAuthRequest) {
    try {
      const currencies = await this._service.getFiatCurrencies(
        {
          accountFilter: true,
          fiatCurrencies: FIAT_CURRENCIES.join(','),
        },
        req.network,
      );
      return successful(currencies, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getOnRampPurchaseLimits(req: IAuthRequest) {
    try {
      const network = req.network;
      const cryptoCurrency = getMeldEthValueByNetwork(network.chainId);
      const limits = await this._service.getOnRampPurchaseLimits(
        {
          accountFilter: true,
          fiatCurrencies: FIAT_CURRENCIES.join(','),
          cryptoCurrencies: cryptoCurrency,
        },
        network,
      );
      return successful(limits, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getOffRampPurchaseLimits(req: IAuthRequest) {
    try {
      const network = req.network;
      const cryptoCurrency = getMeldEthValueByNetwork(network.chainId);
      const limits = await this._service.getOffRampPurchaseLimits(
        {
          accountFilter: true,
          fiatCurrencies: FIAT_CURRENCIES.join(','),
          cryptoCurrencies: cryptoCurrency,
        },
        network,
      );
      return successful(limits, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getCryptoCurrencies(req: IAuthRequest) {
    try {
      const network = req.network;
      const cryptoCurrency = getMeldEthValueByNetwork(network.chainId);
      const currencies = await this._service.getCryptoCurrencies(
        {
          accountFilter: true,
          cryptoCurrencies: cryptoCurrency,
        },
        network,
      );
      return successful(currencies, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getPaymentMethods(req: IAuthRequest) {
    try {
      const network = req.network;
      const cryptoCurrency = getMeldEthValueByNetwork(network.chainId);
      const methods = await this._service.getPaymentMethods(
        {
          accountFilter: true,
          cryptoCurrencies: cryptoCurrency,
        },
        network,
      );
      return successful(methods, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getServiceProviders(req: IAuthRequest) {
    try {
      const network = req.network;
      const cryptoCurrency = getMeldEthValueByNetwork(network.chainId);
      const serviceProviders = await this._service.getServiceProviders(
        {
          accountFilter: true,
          cryptoCurrencies: cryptoCurrency,
        },
        network,
      );
      return successful(serviceProviders, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getQuotes(request: IRequestQuote) {
    try {
      const network = request.network;
      const meldEthValue = getMeldEthValueByNetwork(network.chainId);
      const isOnRamp = FIAT_CURRENCIES.includes(request.body.sourceCurrencyCode);
      const quote = await this._service.getQuotes(
        {
          ...request.body,
          walletAddress: undefined,
          sourceCurrencyCode: isOnRamp
            ? request.body.sourceCurrencyCode
            : meldEthValue,
          destinationCurrencyCode: isOnRamp
            ? meldEthValue
            : request.body.destinationCurrencyCode,
        },
        network,
      );
      return successful(quote, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async createWidgetSession(request: IRequestCreateWidgetSession) {
    try {
      const network = request.network;
      const meldEthValue = getMeldEthValueByNetwork(network.chainId);
      const isSandbox = network.chainId === 0;
      const externalSessionId = `${request.user.id}-${Date.now()}`;
      const isOnRamp = request.body.type === 'BUY';
      const session = await this._service.createWidgetSession(
        {
          sessionType: request.body.type,
          externalSessionId,
          sessionData: {
            lockFields: [
              'cryptoCurrency',
              'destinationCurrencyCode',
              'sourceCurrencyCode',
              'walletAddress',
            ],
            countryCode: request.body.countryCode,
            destinationCurrencyCode: isOnRamp
              ? meldEthValue
              : request.body.destinationCurrencyCode,
            serviceProvider: request.body.serviceProvider,
            sourceCurrencyCode: isOnRamp
              ? request.body.sourceCurrencyCode
              : meldEthValue,
            paymentMethodType: request.body.paymentMethodType,
            sourceAmount: formatAmount(
              request.body.sourceAmount,
              request.body.sourceCurrencyCode,
            ),
            walletAddress: isSandbox
              ? '0xB30fbe035ec95F6106646f77513546e318c7C2DE'
              : request.body.walletAddress,
          },
        },
        network,
      );

      const rampTransaction = await this._rampService.create({
        provider: RampTransactionProvider.MELD,
        user: request.user,
        providerData: {
          paymentStatus: 'IDLE',
          widgetSessionData: session,
          transactionData: null,
        },
        sourceCurrency: request.body.sourceCurrencyCode,
        sourceAmount: request.body.sourceAmount,
        destinationCurrency: request.body.destinationCurrencyCode,
        paymentMethod: request.body.paymentMethodType,
        destinationAmount: request.body.destinationAmount,
        userWalletAddress: request.body.walletAddress,
        isSandbox: network.chainId === 0,
      });

      return successful(rampTransaction, Responses.Created);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }
}

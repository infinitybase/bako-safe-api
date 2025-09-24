import { RampTransactionProvider } from '@src/models/RampTransactions';
import { bindMethods, Responses, successful } from '@src/utils';
import { error } from '@src/utils/error';
import { IRampTransactionService } from '../rampTransactions/types';
import { IMeldService, IRequestCreateWidgetSession, IRequestQuote } from './types';
import {
  CRYPTO_CURRENCIES,
  FIAT_CURRENCIES,
  formatAmount,
  isSandbox,
  meldEthValue,
} from './utils';

export default class MeldController {
  constructor(
    private _service: IMeldService,
    private _rampService: IRampTransactionService,
  ) {
    bindMethods(this);
  }

  async getCountries() {
    try {
      const countries = await this._service.getCountries({
        accountFilter: true,
        cryptoCurrencies: CRYPTO_CURRENCIES.join(','),
      });
      return successful(countries, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getFiatCurrencies() {
    try {
      const currencies = await this._service.getFiatCurrencies({
        accountFilter: true,
        fiatCurrencies: FIAT_CURRENCIES.join(','),
      });
      return successful(currencies, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getOnRampPurchaseLimits() {
    try {
      const limits = await this._service.getOnRampPurchaseLimits({
        accountFilter: true,
        fiatCurrencies: FIAT_CURRENCIES.join(','),
        cryptoCurrencies: CRYPTO_CURRENCIES.join(','),
      });
      return successful(limits, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getOffRampPurchaseLimits() {
    try {
      const limits = await this._service.getOffRampPurchaseLimits({
        accountFilter: true,
        fiatCurrencies: FIAT_CURRENCIES.join(','),
        cryptoCurrencies: CRYPTO_CURRENCIES.join(','),
      });
      return successful(limits, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getCryptoCurrencies() {
    try {
      const currencies = await this._service.getCryptoCurrencies({
        accountFilter: true,
        cryptoCurrencies: CRYPTO_CURRENCIES.join(','),
      });
      return successful(currencies, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getPaymentMethods() {
    try {
      const methods = await this._service.getPaymentMethods({
        accountFilter: true,
        cryptoCurrencies: CRYPTO_CURRENCIES.join(','),
      });
      return successful(methods, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getServiceProviders() {
    try {
      const serviceProviders = await this._service.getServiceProviders({
        accountFilter: true,
        cryptoCurrencies: CRYPTO_CURRENCIES.join(','),
      });
      return successful(serviceProviders, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getQuotes(request: IRequestQuote) {
    try {
      const isOnRamp = FIAT_CURRENCIES.includes(request.body.sourceCurrencyCode);
      const quote = await this._service.getQuotes({
        ...request.body,
        walletAddress: undefined,
        sourceCurrencyCode: isOnRamp
          ? request.body.sourceCurrencyCode
          : meldEthValue,
        destinationCurrencyCode: isOnRamp
          ? meldEthValue
          : request.body.destinationCurrencyCode,
      });
      return successful(quote, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async createWidgetSession(request: IRequestCreateWidgetSession) {
    try {
      const externalSessionId = `${request.user.id}-${Date.now()}`;
      const isOnRamp = request.body.type === 'BUY';
      const session = await this._service.createWidgetSession({
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
      });

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
      });

      return successful(rampTransaction, Responses.Created);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }
}

import { RampTransactionProvider } from '@src/models/RampTransactions';
import { bindMethods, Responses, successful } from '@src/utils';
import { error } from '@src/utils/error';
import { IRampTransactionService } from '../rampTransactions/types';
import { IMeldService, IRequestCreateWidgetSession, IRequestQuote } from './types';
import {
  CRYPTO_CURRENCIES,
  FIAT_CURRENCIES,
  formatAmount,
  serviceProvidersWithFuelIntegration,
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
        serviceProviders: serviceProvidersWithFuelIntegration.join(','),
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
        serviceProviders: serviceProvidersWithFuelIntegration.join(','),
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
        serviceProviders: serviceProvidersWithFuelIntegration.join(','),
      });
      return successful(serviceProviders, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getQuotes(request: IRequestQuote) {
    try {
      const quote = await this._service.getQuotes({
        ...request.body,
        serviceProviders: serviceProvidersWithFuelIntegration,
      });
      return successful(quote, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async createWidgetSession(request: IRequestCreateWidgetSession) {
    try {
      const externalSessionId = `${request.user.id}-${Date.now()}`;
      const session = await this._service.createWidgetSession({
        sessionType: request.body.type,
        externalSessionId,
        sessionData: {
          countryCode: request.body.countryCode,
          destinationCurrencyCode: request.body.destinationCurrencyCode,
          serviceProvider: request.body.serviceProvider,
          sourceCurrencyCode: request.body.sourceCurrencyCode,
          sourceAmount: formatAmount(
            request.body.sourceAmount,
            request.body.sourceCurrencyCode,
          ),
          walletAddress: request.body.walletAddress,
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
      });

      return successful(rampTransaction, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }
}

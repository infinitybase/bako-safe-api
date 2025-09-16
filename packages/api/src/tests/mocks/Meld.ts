import { meldEthValue } from '@src/modules/meld/utils';
import crypto from 'crypto';

export const mockQuotesResponse = (overrides: Partial<any> = {}) => ({
  quotes: [
    {
      countryCode: 'BR',
      customerScore: 1,
      destinationAmount: 0.02,
      destinationAmountWithoutFees: 0.021,
      destinationCurrencyCode: meldEthValue,
      exchangeRate: 10000,
      fiatAmountWithoutFees: 100,
      institutionName: 'TEST BANK',
      lowKyc: true,
      networkFee: 0.001,
      partnerFee: 0.001,
      paymentMethodType: 'PIX',
      serviceProvider: 'TEST',
      sourceAmount: 100,
      sourceAmountWithoutFees: 99,
      sourceCurrencyCode: 'BRL',
      totalFee: 1,
      transactionFee: 0.5,
      transactionType: 'BUY',
      ...overrides,
    },
  ],
});

export const widgetSessionMock = {
  id: 'sess-1',
  token: 'token-abc',
  widgetUrl: 'https://widget.mock',
  externalSessionId: 'ext-session-1',
  externalCustomerId: 'ext-cust-1',
  customerId: 'cust-1',
};

export const meldTransactionListMock = {
  transactions: [
    {
      id: 'tr-1',
      destinationAmount: 0.02,
      destinationCurrencyCode: meldEthValue,
      serviceProvider: 'TEST',
      status: 'SETTLED',
      countryCode: 'BR',
      cryptoDetails: {
        blockchainTransactionId: '0xMOCKCHAINID',
        chainId: '0',
        destinationWalletAddress: '0xabc',
        institution: 'TEST',
        networkFee: 0.001,
        networkFeeInUsd: 0.001,
        partnerFee: 0.001,
        partnerFeeInUsd: 0.001,
        sessionWalletAddress: '0xabc',
        sourceWalletAddress: '0xabc',
        totalFee: 0.002,
        totalFeeInUsd: 0.002,
        transactionFee: 0.001,
        transactionFeeInUsd: 0.001,
      },
    },
  ],
};

export const getValidMeldSignature = (
  secret: string,
  timestamp: string,
  body: unknown,
) => {
  // Generate valid signature that matches what the middleware expects
  const protocol = 'http';
  const host = '127.0.0.1';
  const originalUrl = '/webhooks/meld/crypto';
  const url = `${protocol}://${host}${originalUrl}`;
  const bodyString = JSON.stringify(body);
  const signedPayload = `${timestamp}.${url}.${bodyString}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64url')
    .replace(/=/g, '');
};

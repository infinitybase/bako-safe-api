import { MeldApiFactory } from '@src/modules/meld/utils';
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import {
  getValidMeldSignature,
  meldTransactionListMock,
  mockQuotesResponse,
  widgetSessionMock,
} from './mocks/Meld';

import { RampTransactionProvider } from '@src/models/RampTransactions';
import { UnauthorizedErrorTitles } from '@src/utils/error';
import axios from 'axios';
import { generateNode } from './mocks/Networks';
import { saveMockPredicate } from './mocks/Predicate';
import { TestEnvironment } from './utils/Setup';

test('On Ramp endpoints', async t => {
  const { node } = await generateNode();
  const { app, users, close, predicates } = await TestEnvironment.init(1, 1, node);
  const user = users?.[0];
  const vault = predicates?.[0];

  let widgetResponse: request.Response;
  const sandboxSecret = process.env.MELD_SANDBOX_WEBHOOK_SECRET;
  const productionSecret = process.env.MELD_PRODUCTION_WEBHOOK_SECRET;

  t.before(async () => {
    await saveMockPredicate(vault, user, app);
    process.env.MELD_SANDBOX_WEBHOOK_SECRET = 'test_secret';
    process.env.MELD_PRODUCTION_WEBHOOK_SECRET = 'test_secret';
  });

  t.after(async () => {
    await close();
    // Restore all mocks after tests complete
    test.mock.restoreAll();
    process.env.MELD_SANDBOX_WEBHOOK = sandboxSecret;
    process.env.MELD_PRODUCTION_WEBHOOK = productionSecret;
  });

  await t.test('should get meld quotes', async () => {
    const mock = t.mock.method(MeldApiFactory, 'getMeldApiByNetwork', () => {
      console.log('🚀 getMeldQuotes MOCK CALLED');
      return {
        getMeldQuotes: async () => mockQuotesResponse(),
      };
    });
    const quoteRes = await request(app)
      .post('/ramp-transactions/meld/quotes')
      .set('Authorization', user.token)
      .set('Signeraddress', user.payload.address)
      .send({
        countryCode: 'BR',
        destinationCurrencyCode: 'ETH',
        sourceAmount: 100,
        sourceCurrencyCode: 'BRL',
        paymentMethodType: 'PIX',
      });

    assert.equal(mock.mock.calls.length, 1);
    assert.equal(quoteRes.status, 200);
    assert.ok(Array.isArray(quoteRes.body.quotes));
    assert.equal(quoteRes.body.quotes[0].destinationCurrencyCode, 'ETH');
  });

  await t.test('should create meld widget session', async () => {
    const mock = t.mock.method(MeldApiFactory, 'getMeldApiByNetwork', () => {
      console.log('🎯 createMeldWidgetSession MOCK CALLED');
      return { createMeldWidgetSession: async () => widgetSessionMock };
    });

    const widgetRes = await request(app)
      .post('/ramp-transactions/meld/widget')
      .set('Authorization', user.token)
      .set('Signeraddress', user.payload.address)
      .send({
        type: 'BUY',
        countryCode: 'BR',
        destinationCurrencyCode: 'ETH',
        serviceProvider: 'TEST',
        sourceAmount: '100,00',
        destinationAmount: '0.0742',
        sourceCurrencyCode: 'BRL',
        paymentMethodType: 'PIX',
        walletAddress: vault.address.b256Address,
      });

    assert.equal(mock.mock.calls.length, 1);
    assert.equal(widgetRes.status, 201);
    assert.equal(widgetRes.body.provider, RampTransactionProvider.MELD);
    assert.equal(
      widgetRes.body.providerData?.widgetSessionData?.widgetUrl,
      widgetSessionMock.widgetUrl,
    );

    widgetResponse = widgetRes;
  });

  await t.test('should get created ramp transaction', async () => {
    const rampTxId = widgetResponse.body.id;
    const fetchRampRes = await request(app)
      .get(`/ramp-transactions/${rampTxId}`)
      .set('Authorization', user.token)
      .set('Signeraddress', user.payload.address);

    assert.equal(fetchRampRes.status, 200);
    assert.equal(fetchRampRes.body.id, rampTxId);
    assert.equal(fetchRampRes.body.widgetUrl, widgetSessionMock.widgetUrl);
    assert.equal(fetchRampRes.body.status, 'IDLE');
  });

  await t.test("should process meld's webhook and validate signature", async () => {
    const mock = t.mock.method(axios, 'create', () => {
      console.log('🎯 getMeldTransactions MOCK CALLED');
      return { get: async () => ({ data: meldTransactionListMock }) };
    });

    // Use a fixed timestamp for both payload and signature
    const timestamp = new Date().toISOString();

    const webhookPayload = {
      eventType: 'PAYMENT_TRANSACTION_STATUS_CHANGED',
      eventId: 'evt-1',
      timestamp: timestamp,
      accountId: 'acc-1',
      version: '1',
      payload: {
        accountId: 'acc-1',
        paymentTransactionId: 'ptx-1',
        externalSessionId:
          widgetResponse.body.providerData.widgetSessionData.externalSessionId,
        paymentTransactionStatus: 'SETTLED',
      },
    };

    const meldSignature = getValidMeldSignature(
      process.env.MELD_SANDBOX_WEBHOOK_SECRET!,
      timestamp,
      webhookPayload,
    );
    console.log(
      'DEBUG: Generated meldSignature:',
      meldSignature,
      process.env.MELD_SANDBOX_WEBHOOK_SECRET,
    );

    const webhookRes = await request(app)
      .post('/webhooks/meld/crypto')
      .set('host', '127.0.0.1')
      .set('meld-signature', meldSignature)
      .set('meld-signature-timestamp', timestamp)
      .send(webhookPayload);

    // assert.equal(mock.mock.calls.length, 1);
    assert.equal(webhookRes.status, 200);
    assert.equal(webhookRes.body.message, 'Webhook processed successfully');
  });

  await t.test(
    'should have updated ramp transaction status to SETTLED',
    async () => {
      const rampTxId = widgetResponse.body.id;
      const fetchRampRes = await request(app)
        .get(`/ramp-transactions/${rampTxId}`)
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address);

      assert.equal(fetchRampRes.status, 200);
      assert.equal(fetchRampRes.body.id, rampTxId);
      assert.equal(fetchRampRes.body.widgetUrl, widgetSessionMock.widgetUrl);
      assert.equal(fetchRampRes.body.status, 'SETTLED');
    },
  );

  await t.test('should reject webhook with invalid meld signature', async () => {
    // Use a fixed timestamp for payload
    const timestamp = new Date().toISOString();

    const webhookPayload = {
      eventType: 'PAYMENT_TRANSACTION_STATUS_CHANGED',
      eventId: 'evt-1',
      timestamp: timestamp,
      accountId: 'acc-1',
      version: '1',
      payload: {
        accountId: 'acc-1',
        paymentTransactionId: 'ptx-1',
        externalSessionId: 'test-session-id',
        paymentTransactionStatus: 'SETTLED',
      },
    };

    const invalidSignature = 'invalid-signature-123';

    const webhookRes = await request(app)
      .post('/webhooks/meld/crypto')
      .set('host', '127.0.0.1')
      .set('meld-signature', invalidSignature)
      .set('meld-signature-timestamp', timestamp)
      .send(webhookPayload);

    assert.equal(webhookRes.status, 401);
    assert.equal(webhookRes.body.origin, 'app');
    assert.equal(
      webhookRes.body.errors.title,
      UnauthorizedErrorTitles.INVALID_SIGNATURE,
    );
  });
});

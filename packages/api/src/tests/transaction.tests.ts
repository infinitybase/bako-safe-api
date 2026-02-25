import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { saveMockPredicate } from './mocks/Predicate';
import { saveMockTransaction, transactionMock } from '@src/tests/mocks/Transaction';
import { TransactionStatus, TransactionType, WitnessStatus } from 'bakosafe';
import { Transaction } from '@src/models';
import { generateNode } from './mocks/Networks';

test('Transaction Endpoints', async t => {
  const { node } = await generateNode();

  const { app, users, predicates, wallets, close } = await TestEnvironment.init(
    5,
    6,
    node,
  );

  t.after(async () => {
    await close();
    node.cleanup();
  });

  const vault_1 = predicates[1];
  const wallet = wallets[0];

  const {
    tx: transaction,
    status: status,
    predicate: predicate,
    payload_transfer: payload_transfer,
  } = await saveMockTransaction({ vault: vault_1, user: users[1] }, app);

  assert.equal(status, 201);

  await t.test('POST /transaction should create transaction', async () => {
    const vault = predicates[0];
    await saveMockPredicate(vault, users[0], app);

    const { payload_transfer } = await transactionMock(vault);

    const { body: resTx, status } = await request(app)
      .post('/transaction')
      .set('Authorization', users[0].token)
      .set('Signeraddress', users[0].payload.address)
      .send(payload_transfer);

    assert.equal(status, 201);
    assert.ok(resTx.id);
    assert.strictEqual(resTx.hash, payload_transfer.hash);
    assert.ok(resTx.predicate.predicateAddress);
    assert.strictEqual(resTx.predicate.predicateAddress, vault.address.toB256());
    assert.ok(resTx.assets);
    assert.ok(resTx.resume.witnesses);
    // assert.equal(
    //   resTx.resume.witnesses.length,
    //   vault.configurable.SIGNERS.filter(i => i != ZeroBytes32).length,
    // );
  });

  await t.test('GET /transaction should list transactions', async () => {
    const res = await request(app)
      .get('/transaction')
      .set('Authorization', users[0].token)
      .set('Signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 1);

    res.body.forEach(element => {
      assert.ok(element.id);
      assert.ok(element.predicate.id);
      assert.ok(element.hash);
      assert.ok(element.predicate.predicateAddress);
      assert.ok('url' in element.network);
      assert.ok('chainId' in element.network);
      const aux = element.predicate;
      assert.ok('id' in aux.workspace);
      assert.ok('name' in aux.workspace);
      assert.ok(Object.values(TransactionType).includes(element.type));
    });
  });

  await t.test(
    'GET /transaction?page=${}&perPage=${} should list transactions with pagination',
    async () => {
      const page = 1;
      const perPage = 6;

      const res = await request(app)
        .get(`/transaction?page=${page}&perPage=${perPage}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('total' in res.body);
      assert.equal(res.body.currentPage, page);
      assert.equal(res.body.perPage, perPage);
      assert.ok(res.body.data.length <= perPage);
    },
  );

  await t.test(
    'GET /transaction?status=${} should list transactions by status',
    async () => {
      const _status = [
        TransactionStatus.AWAIT_REQUIREMENTS,
        TransactionStatus.PENDING_SENDER,
      ];

      const res = await request(app)
        .get(`/transaction?status[]=${_status[0]}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      res.body.forEach(element => {
        const aux = _status.includes(element.status);
        assert.strictEqual(aux, true);
      });

      const resPending = await request(app)
        .get(`/transaction?status[]=${_status[1]}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(resPending.status, 200);
      assert.strictEqual(resPending.body.length, 0);
    },
  );

  await t.test('GET /transaction/:id should list transactions by id', async () => {
    const res = await request(app)
      .get(`/transaction/${transaction.id}`)
      .set('Authorization', users[0].token)
      .set('Signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.strictEqual(res.body.id, transaction.id);
    assert.strictEqual(res.body.name, payload_transfer.name);
    assert.strictEqual(res.body.hash, payload_transfer.hash);
    assert.strictEqual(res.body.status, payload_transfer.status);
  });

  await t.test(
    'GET /transaction/by-hash/:hash should list transactions by hash',
    async () => {
      const _status = [TransactionStatus.AWAIT_REQUIREMENTS];

      const vault = predicates[2];

      const {
        tx: transaction,
        status,
        payload_transfer,
      } = await saveMockTransaction({ vault: vault, user: users[2] }, app);

      assert.equal(status, 201);

      const res = await request(app)
        .get(`/transaction/by-hash/0x${transaction.hash}?status[]=${_status[0]}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.strictEqual(res.body.id, transaction.id);
      assert.strictEqual(res.body.hash, transaction.hash);
      assert.strictEqual(res.body.name, payload_transfer.name);
      assert.strictEqual(res.body.status, payload_transfer.status);
    },
  );

  await t.test(
    'GET /transaction/history/:id/:predicateId should get transaction history',
    async () => {
      const res = await request(app)
        .get(`/transaction/history/${transaction.id}/:${predicate.id}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);

      res.body.forEach(element => {
        assert.ok(element.type);
        assert.ok(element.date);
        assert.ok(element.owner);
        assert.ok('type' in element.owner);
        assert.ok('id' in element.owner);
        assert.ok('avatar' in element.owner);
        assert.ok('address' in element.owner);
        const member = predicate.members.find(
          member => member.id === element.owner.id,
        );
        for (const key of Object.keys(element.owner)) {
          assert.deepStrictEqual(member[key], element.owner[key]);
        }
      });
    },
  );

  await t.test(
    'GET /transaction/pending should get transactions pending',
    async () => {
      const user = users[0];

      // Capture the count before creating the transaction
      const resBefore = await request(app)
        .get(`/transaction/pending`)
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address);

      assert.equal(resBefore.status, 200);
      const previousCount = resBefore.body.ofUser;

      const vault = predicates[predicates.length - 1];
      const { tx, status } = await saveMockTransaction({ vault, user }, app);

      assert.equal(status, 201);
      assert.equal(tx.status, TransactionStatus.AWAIT_REQUIREMENTS);

      const res = await request(app)
        .get(`/transaction/pending`)
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address);

      assert.equal(res.status, 200);
      assert.ok('ofUser' in res.body);
      assert.ok('transactionsBlocked' in res.body);
      assert.ok('pendingSignature' in res.body);
      assert.strictEqual(res.body.ofUser, previousCount + 1);
      assert.strictEqual(res.body.transactionsBlocked, true);
      assert.strictEqual(res.body.pendingSignature, true);
    },
  );

  await t.test('PUT /transaction/sign/:hash should validate the sign', async () => {
    const signature = await wallet.signMessage(transaction.hash);

    const signPayload = {
      signature,
      approve: true,
    };

    const res = await request(app)
      .put(`/transaction/sign/${transaction.hash}`)
      .set('Authorization', users[0].token)
      .set('Signeraddress', users[0].payload.address)
      .send(signPayload);

    assert.equal(res.status, 200);
    assert.strictEqual(res.body, true);

    const resWrongHash = await request(app)
      .put(`/transaction/sign/'hash'`)
      .set('Authorization', users[0].token)
      .set('Signeraddress', users[0].payload.address)
      .send(signPayload);

    assert.equal(resWrongHash.status, 404);
  });

  // nao sera mais necessario. Fazemos o send assim q assinamos ultima assinatura no endpoint sign.
  // await t.test('PUT /transaction/send/:hash should send tx to chain', async () => {
  //   await Transaction.update(
  //     { id: transaction_1.id },
  //     { status: TransactionStatus.PENDING_SENDER },
  //   );

  //   const res = await request(app)
  //     .post(`/transaction/send/0x${transaction_1.hash}`)
  //     .set('Authorization', users[0].token)
  //     .set('Signeraddress', users[0].payload.address);

  //   assert.equal(res.status, 200);
  //   assert.strictEqual(res.body, true);
  // });

  await t.test(
    'GET /transaction/:id/advanced-details get tx with advanced details',
    async () => {
      const vault_2 = predicates[4];
      const { tx: txDetails, status: statusDetails } = await saveMockTransaction(
        { vault: vault_2, user: users[4] },
        app,
      );

      assert.equal(statusDetails, 201);

      const res = await request(app)
        .get(`/transaction/${txDetails.id}/advanced-details`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.strictEqual(res.body.status, TransactionStatus.AWAIT_REQUIREMENTS);
      assert.ok(res.body.txRequest);
      assert.ok('gasLimit' in res.body.txRequest);
      assert.ok('maxFee' in res.body.txRequest);
      assert.ok('type' in res.body.txRequest);

      await Transaction.update(
        { id: txDetails.id },
        { status: TransactionStatus.FAILED },
      );

      const resFailed = await request(app)
        .get(`/transaction/${txDetails.id}/advanced-details`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(resFailed.status, 200);
      assert.strictEqual(resFailed.body.status, TransactionStatus.FAILED);
      assert.ok(resFailed.body.receipts);
      resFailed.body.receipts.forEach(receipt => {
        assert.ok('type' in receipt);
        if (receipt.type === 1) {
          assert.ok('id' in receipt);
          assert.ok('val' in receipt);
          assert.ok('pc' in receipt);
          assert.ok('is' in receipt);
        } else if (receipt.type === 9) {
          assert.ok('result' in receipt);
          assert.ok('gasUsed' in receipt);
        }
      });
    },
  );

  await t.test(
    'GET /transaction/with-incomings get tx with incomings',
    async () => {
      const res = await request(app)
        .get(`/transaction/with-incomings`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);

      res.body.forEach(element => {
        assert.ok(element.id);
        assert.ok(element.hash);
        assert.ok(element.name);
        assert.ok(element.status);
        assert.ok(element.type);
        assert.ok(element.network);
        assert.ok(element.createdAt);
        assert.ok(element.resume);
        assert.ok(element.predicate);
        assert.ok('id' in element.predicate);
        assert.ok('members' in element.predicate);
        assert.ok('predicateAddress' in element.predicate);
        assert.ok(element.assets);
        assert.ok(element.txData);
        assert.ok('witnesses' in element.txData);
      });
    },
  );

  await t.test(
    'PUT /transaction/close/:id should close transaction (set as success)',
    async () => {
      const closePayload = {
        gasUsed: transaction.gasUsed ?? '0.000001',
        transactionResult: JSON.stringify(transaction.resume),
      };

      const res = await request(app)
        .put(`/transaction/close/${transaction.id}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address)
        .send(closePayload);

      assert.ok(res.body.resume);

      const resumeString = Object.values(res.body.resume)
        .filter(val => typeof val === 'string' && val.length === 1)
        .join('');

      assert.equal(res.status, 200);
      assert.strictEqual(res.body.id, transaction.id);
      assert.strictEqual(res.body.status, TransactionStatus.SUCCESS);
      assert.strictEqual(res.body.gasUsed, closePayload.gasUsed);
      assert.strictEqual(resumeString, closePayload.transactionResult);
    },
  );

  await t.test(
    'PUT /transaction/cancel/:hash should cancel transaction (set as canceled)',
    async () => {
      const vault = predicates[3];

      const { tx: transaction, status, predicate } = await saveMockTransaction(
        { vault: vault, user: users[3] },
        app,
      );

      assert.equal(status, 201);

      const res = await request(app)
        .put(`/transaction/cancel/${transaction.hash}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.strictEqual(res.body.hash, transaction.hash);

      assert.ok(res.body.witnesses);
      assert.ok(res.body.totalSigners);
      assert.ok(res.body.requiredSigners >= 1);
      assert.strictEqual(res.body.predicate.id, predicate.id);
      assert.strictEqual(res.body.predicate.address, predicate.predicateAddress);

      res.body.witnesses.forEach((witness, index) => {
        const expectedStatus =
          index === 0 ? WitnessStatus.CANCELED : WitnessStatus.PENDING;
        assert.strictEqual(witness.status, expectedStatus);
        assert.strictEqual(witness.singnature, undefined);
        assert.strictEqual(witness.account, predicate.members[index].address);
      });
    },
  );

  await t.test(
    'DELETE /transaction/by-hash/:hash should delete latest transaction by hash',
    async () => {
      const vault = predicates[3];

      const { tx: transaction, status } = await saveMockTransaction(
        { vault: vault, user: users[3] },
        app,
      );

      assert.equal(status, 201);

      const res = await request(app)
        .delete(`/transaction/by-hash/${transaction.hash}`)
        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
    },
  );

  await t.test(
    'Should correctly handle new transaction with same hash as canceled transaction',
    async () => {
      const vault = predicates[2];
      const user = users[0];

      // Step 1: Create a transaction
      const { payload_transfer: payload1 } = await transactionMock(vault);

      const { body: createdTx1 } = await request(app)
        .post('/transaction')
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address)
        .send(payload1);

      assert.equal(createdTx1.status, TransactionStatus.AWAIT_REQUIREMENTS);
      const txHash = createdTx1.hash;

      // Step 2: Cancel the first transaction
      const { body: canceledTx, status: statusCancel } = await request(app)
        .put(`/transaction/cancel/${txHash}`)
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address);

      assert.equal(statusCancel, 200);
      assert.equal(canceledTx.status, TransactionStatus.CANCELED);

      // Step 3: Create a new transaction with the same hash (identical)
      const { body: createdTx2 } = await request(app)
        .post('/transaction')
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address)
        .send(payload1);

      assert.equal(createdTx2.status, TransactionStatus.AWAIT_REQUIREMENTS);
      assert.equal(createdTx2.hash, txHash); // Same hash as canceled transaction

      // Step 4: Sign the new transaction
      const signature = await wallet.signMessage(txHash);
      const signPayload = {
        signature,
        approve: true,
      };

      const { body: signedTx, status: statusSign } = await request(app)
        .put(`/transaction/sign/${txHash}`)
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address)
        .send(signPayload);

      assert.equal(statusSign, 200);
      assert.equal(signedTx, true);

      // Step 5: Verify the transaction status after signing
      const { body: finalTx, status: finalStatus } = await request(app)
        .get(`/transaction/${createdTx2.id}`)
        .set('Authorization', user.token)
        .set('Signeraddress', user.payload.address);

      assert.equal(finalStatus, 200);
      assert.equal(finalTx.id, createdTx2.id);
      assert.ok(
        finalTx.status === TransactionStatus.SUCCESS ||
          finalTx.status === TransactionStatus.FAILED,
      );
    },
  );
});

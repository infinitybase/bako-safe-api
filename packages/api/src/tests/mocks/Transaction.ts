import { TransactionStatus, Vault } from 'bakosafe';
import { Address } from 'fuels';
import request from 'supertest';
import { tokensIDS } from '@src/utils/assets-token/addresses';
import { saveMockPredicate } from '@src/tests/mocks/Predicate';
import { TestUser } from '@src/tests/utils/Setup';
import { Application } from 'express';

interface ISaveTransactionMock {
  vault: Vault;
  user: TestUser;
}

export const transactionMock = async (vault: Vault, to?: string) => {
  const assets = [
    {
      amount: '0.000000001',
      assetId: tokensIDS.ETH,
      to:
        to ?? '0x94FFcC53B892684aceFaeBC8a3d4A595E528a8cf664eeB3Ef36f1020B0809d0d',
    },
  ];

  const { hashTxId, tx } = await vault.transaction({
    name: `teste-tx-mock-${Date.now()}`,
    assets: [...assets],
  });

  const payload_transfer = {
    predicateAddress: vault.address.toString(),
    name: `[TESTE_MOCK] ${Address.fromRandom().toString()}`,
    hash: hashTxId,
    txData: tx,
    status: TransactionStatus.AWAIT_REQUIREMENTS,
  };

  return { tx, payload_transfer };
};

export const saveMockTransaction = async (
  payload: ISaveTransactionMock,
  app: Application,
  to?: string,
) => {
  const { user, vault } = payload;

  const { predicate } = await saveMockPredicate(vault, user, app);

  const { payload_transfer } = await transactionMock(vault, to);

  const { status, body: transaction } = await request(app)
    .post('/transaction')
    .set('Authorization', user.token)
    .set('Signeraddress', user.payload.address)
    .send(payload_transfer);

  return { tx: transaction, status, predicate, payload_transfer };
};

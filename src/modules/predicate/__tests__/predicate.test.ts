import {
  predicate,
  predicateNegativeMinSigners,
  predicateEmptyAddresses,
  predicateDecimalMinSigners,
  predicateStringMinSigners,
  predicateStringChainId,
} from '@mocks/predicate';
import supertest from 'supertest';

import App from '@src/server/app';
import Bootstrap from '@src/server/bootstrap';

const app = new App();
const request = supertest(app.serverApp);

describe('Predicate module', () => {
  beforeAll(async () => {
    await Bootstrap.start();
  });

  describe('Required fields', () => {
    test('return status 400 if "name" is not provided', async () => {
      const { name, ...rest } = predicate;
      await request.post('/predicate').send(rest).expect(400);
    });
    test('return status 400 if "predicateAddress" is not provided', async () => {
      const { predicateAddress, ...rest } = predicate;
      await request.post('/predicate').send(rest).expect(400);
    });

    // Repetir os testes acima para todos os campos obrigatórios
    // Verificar no arquivo "validations" quais campos são obrigatórios
  });

  describe('Field types', () => {
    test('return status 400 if "addresses" is an empty array', async () => {
      await request.post('/predicate').send(predicateEmptyAddresses).expect(400);
    });
    test('return status 400 if "minSigners" is a negative number', async () => {
      await request
        .post('/predicate')
        .send(predicateNegativeMinSigners)
        .expect(400);
    });
    test('return status 400 if "minSigners" is a decimal number', async () => {
      await request.post('/predicate').send(predicateDecimalMinSigners).expect(400);
    });
    test('return status 400 if "minSigner" is a stringified number', async () => {
      await request.post('/predicate').send(predicateStringMinSigners).expect(400);
    });
    test('return status 400 if "chainId" is a stringified number', async () => {
      await request.post('/predicate').send(predicateStringChainId).expect(400);
    });
  });

  describe('DB operations', () => {
    test('create a predicate if a valid payload is provided', async () => {
      const result = await request.post('/predicate').send(predicate).expect(200);
      expect(result.body).toHaveProperty('id');
    });
  });
});

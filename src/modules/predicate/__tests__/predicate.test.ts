import { predicate } from '@mocks/predicate';
import supertest from 'supertest';

import App from '@src/server/app';
import Bootstrap from '@src/server/bootstrap';

const app = new App();
const request = supertest(app.serverApp);

describe('[PREDICATE]', () => {
  beforeAll(async () => {
    await Bootstrap.start();
  });

  test('[CREATE] /predicate/', async () => {
    const result = await request.post('/predicate/').send(predicate).expect(200);
    expect(result.body).toMatchObject({
      ...predicate,
    });
  });
  test('[INVALID_CREATE] /predicate/', async () => {
    const result = await request
      .post('/predicate/')
      .send({ ...predicate, minSigners: -1.5 })
      .expect(500);
  });
  test('[INVALID_TYPE_ADDRESS] /predicate/', async () => {
    const result = await request
      .post('/predicate/')
      .send({ ...predicate, addresses: [] })
      .expect(400);
  });
  test('[INVALID_MINSIGNER_NOT_INT] /predicate/', async () => {
    const result = await request
      .post('/predicate/')
      .send({ ...predicate, minSigners: 2.5 })
      .expect(500);
  });
  test('[DELETAT_NOT_NULL] /predicate/', async () => {
    //Perceba que o predicado passado está com minSigners e chaindId passados como uma str de int e deu boa, mas quando passado outra str ele quebra
    const result = await request
      .post('/predicate/')
      .send({
        ...predicate,
        predicateAddress: '',
        provider: 'bla',
        chainId: '-31',
      })
      .expect(400);
  });
  test('[DELETE_PREDICATE_predicateNullAddress]', async () => {
    const responsePost = await request
      .post('/predicate/')
      .send({
        ...predicate,
        name: 'Roy Mustang',
        predicateAddress:
          '0x0000000000000000000000000000000000000000000000000000000000000123',
        minSigners: 2,
        addresses: [],
        owner: '0x0000000000000000000000000000000000000000000000000000000000042069',
        chainId: 12,
      })
      .expect(200);
    const predicateUpId = responsePost.body.id;
    //  predicateAddress:'0x0000000000000000000000000000000000000000000000000000000000000123',
    //   owner: '0x0000000000000000000000000000000000000000000000000000000000042069',
    //  configurable: 'update',
    const response = await request
      .delete(`/predicate/${predicateUpId}`)
      .send({ id: `${predicateUpId}` })
      .expect(200);
  });
  test('[DELETE_WRONG_PREDICATE]', async () => {
    const responsePost = await request
      .post('/predicate/')
      .send({
        ...predicate,
        minSigners: -1,
        addresses: [],
        chainId: -512312,
      })
      .expect(200);
    const predicateUpId = responsePost.body.id;
    const response = await request
      .delete(`/predicate/${predicateUpId}`)
      .send({ id: `${predicateUpId}` })
      .expect(200);
  });
  test('[VERIFY] /predicate/', async () => {
    const response = await request.get('/predicate/').expect(200);
    // Verifique o tipo dos objetos na resposta
    expect(Array.isArray(response.body)).toBe(true);
    // Verifique o tipo dos campos em cada objeto
    response.body.forEach(item => {
      if (
        item.id === null ||
        item.name === null ||
        item.createdAt === null ||
        item.description === null ||
        item.addresses === null ||
        item.minSigners === null ||
        item.owner === null ||
        item.bytes === null ||
        item.abi === null ||
        item.provider === null
      ) {
        throw new Error("O campo 'chainId' não pode ser nulo.");
      }
      if (
        item.owner ===
          '0x0000000000000000000000000000000000000000000000000000000000042069' ||
        item.name === 'Apagado'
      ) {
        throw new Error(
          'O método DELETE deu errado, favor conferir o que está acontecendo.',
        );
      }
      expect(typeof item.id).toBe('string');
      expect(typeof item.createdAt).toBe('string');
      expect(item.deletedAt).toBe(null); // Certifique-se de que este campo pode ser nulo
      expect(typeof item.updatedAt).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(typeof item.predicateAddress).toBe('string');
      expect(typeof item.description).toBe('string');
      expect(typeof item.minSigners).toBe('number');
    });
  });
});

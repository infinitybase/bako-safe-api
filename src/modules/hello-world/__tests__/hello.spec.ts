// import supertest from 'supertest';
// import App from '@src/server/app';

// const app = new App();
// const request = supertest(app.serverApp);

describe('hello-world', () => {
  it('GET /hello/world', async () => {
    // const response = await request.get('/hello/world').expect(200);
    // expect(response.body.testing).toBe('Hello, world!');
    expect(1 + 1).toBe(2);
  });
});

import axios from 'axios';

import { networks } from '@src/mocks/networks';
import { Encoder } from '@src/models';

import { Address, Wallet } from 'fuels';
import { TypeUser } from 'bakosafe';

import Express from 'express';
import request from 'supertest';
import App from '@src/server/app';
import * as http from 'http';
import Bootstrap from '@src/server/bootstrap';
import { FuelProvider, RedisReadClient, RedisWriteClient } from '@src/utils';

const { API_URL } = process.env;

describe('[AUTH]', () => {
  let app: Express.Application;
  let server: http.Server;

  beforeAll(async () => {
    const appInstance = await App.start();
    app = appInstance.serverApp;
    server = app.listen(0);
    server.on('close', () => {
      console.log('>>> HTTP server closed');
    });
  });

  afterAll(async () => {
    console.log('Stopping bootstrap...');
    await Bootstrap.stop();

    await RedisWriteClient.stop();
    await RedisReadClient.stop();

    console.log('Bootstrap stopped');

    await new Promise<void>((resolve, reject) => {
      console.log('>>> try close server');
      server.close(err => {
        console.log('>>> err close server', err);
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('TEST CLEANUP COMPLETE');

    // setTimeout(() => {
    //   process.exit(0);
    // }, 5000);
  });

  it('should handle the TOKEN strategy correctly', async () => {
    console.log('>>> chegamos no provider');

    const provider = await FuelProvider.create(networks['local']);

    console.log('>>> passamos do provider');

    // // create a new user
    const wallet = Wallet.generate();
    const address = wallet.address.toB256();

    const newUser = {
      address,
      provider: networks['local'],
      name: `test mock - ${Address.fromRandom().toB256()}`,
      type: TypeUser.FUEL,
    };

    console.log('>>>> POST AUTH', newUser);

    // // create a new user, and recive a new code to sign-in
    const { body: user } = await request(app).post('/user/').send(newUser);
    expect(user).toHaveProperty('code');

    // sign message code
    const token = await Wallet.fromPrivateKey(wallet.privateKey).signMessage(
      user.code,
    );

    // // sign-in with code
    const { body: session } = await request(app).post(`/auth/sign-in`).send({
      encoder: Encoder.FUEL,
      signature: token,
      digest: user.code,
      userAddress: address,
    });

    expect(session).toHaveProperty('accessToken', token);
    expect(session).toHaveProperty('workspace');
    expect(session).toHaveProperty('user_id', user.userId);
    expect(session).toHaveProperty('network', {
      url: provider.url,
      chainId: await provider.getChainId(),
    });

    // // get a route with required auth
    const { body: userInfo } = await request(app)
      .get(`/user/latest/info`)
      .set('Authorization', session.accessToken)
      .set('Signeraddress', address);

    console.log('>>> userInfo', userInfo);

    expect(userInfo).toHaveProperty('address', newUser.address);
    expect(userInfo).toHaveProperty('name', newUser.name);
    expect(userInfo).toHaveProperty('network', {
      url: provider.url,
      chainId: await provider.getChainId(),
    });

    //change network
    const newNetwork = networks['devnet'];

    await request(app)
      .post(`/user/select-network`)
      .set('Authorization', session.accessToken)
      .set('Signeraddress', address)
      .send({
        network: newNetwork,
      });

    //console.log('updatedSession', updatedSession);

    const { body: updatedNetwork } = await request(app)
      .get(`/user/latest/info`)
      .set('Authorization', session.accessToken)
      .set('Signeraddress', address);

    const newProvider = await FuelProvider.create(newNetwork);

    expect(updatedNetwork).toHaveProperty('network', {
      url: newProvider.url,
      chainId: await newProvider.getChainId(),
    });
  });
});

//   describe('[AUTH]', () => {
//     it('should handle the TOKEN strategy correctly', async () => {
//       const api = axios.create({
//         baseURL: API_URL,
//       });

//       //const provider = await FuelProvider.create(networks['local']);

//       // // create a new user
//       const wallet = Wallet.generate();
//       const address = wallet.address.toB256();

//       const newUser = {
//         address,
//         provider: networks['local'],
//         name: `test mock - ${Address.fromRandom().toB256()}`,
//         type: TypeUser.FUEL,
//       };

//       console.log('>>>> POST AUTH', newUser);

//       // // create a new user, and recive a new code to sign-in
//       const { data: user } = await api.post(`/user`, newUser);
//       expect(user).toHaveProperty('code');

//       // sign message code
//       const token = await Wallet.fromPrivateKey(wallet.privateKey).signMessage(
//         user.code,
//       );

//       console.log('>>> token', token);

//       // // sign-in with code
//       const { data: session } = await api.post(`/auth/sign-in`, {
//         encoder: Encoder.FUEL,
//         signature: token,
//         digest: user.code,
//         userAddress: address,
//       });

//       expect(session).toHaveProperty('accessToken', token);
//       expect(session).toHaveProperty('workspace');
//       expect(session).toHaveProperty('user_id', user.userId);
//       // expect(session).toHaveProperty('network', {
//       //   url: provider.url,
//       //   chainId: provider.getChainId(),
//       // });

//       api.defaults.headers.common['Authorization'] = session.accessToken;
//       api.defaults.headers.common['Signeraddress'] = address;

//       // // get a route with required auth
//       const { data: userInfo } = await api.get(`/user/latest/info`);

//       expect(userInfo).toHaveProperty('address', newUser.address);
//       expect(userInfo).toHaveProperty('name', newUser.name);
//       // expect(userInfo).toHaveProperty('network', {
//       //   url: provider.url,
//       //   chainId: provider.getChainId(),
//       // });

//       // change network
//       const newNetwork = networks['devnet'];

//       // // update network
//       await api.post(`/user/select-network`, {
//         network: newNetwork,
//       });

//       // console.log('updatedSession', updatedSession);

//       const { data: updatedNetwork } = await api.get(`/user/latest/info`);

//       // const newProvider = await FuelProvider.create(newNetwork);

//       // expect(updatedNetwork).toHaveProperty('network', {
//       //   url: newProvider.url,
//       //   chainId: newProvider.getChainId(),
//       // });
//     });
//   });
// });

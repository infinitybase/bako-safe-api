import axios from 'axios';

import { networks } from '@src/mocks/networks';
import { Encoder } from '@src/models';

import { Address, Provider, Wallet } from 'fuels';
import { TypeUser } from 'bakosafe';

const { API_URL } = process.env;

describe('[AUTH]', () => {
  it('should handle the TOKEN strategy correctly', async () => {
    const api = axios.create({
      baseURL: API_URL,
    });
    const provider = await Provider.create(networks['local']);

    // create a new user
    const wallet = Wallet.generate();
    const newUser = {
      address: wallet.address.toB256(),
      provider: networks['local'],
      name: `test mock - ${Address.fromRandom().toB256()}`,
      type: TypeUser.FUEL,
    };

    // create a new user, and recive a new code to sign-in
    const { data: user } = await api.post(`/user`, newUser);
    expect(user).toHaveProperty('code');

    // sign message code
    const token = await Wallet.fromPrivateKey(wallet.privateKey).signMessage(
      user.code,
    );

    // sign-in with code
    const { data: session } = await api.post(`/auth/sign-in`, {
      encoder: Encoder.FUEL,
      signature: token,
      digest: user.code,
    });

    expect(session).toHaveProperty('accessToken', token);
    expect(session).toHaveProperty('workspace');
    expect(session).toHaveProperty('user_id', user.userId);
    expect(session).toHaveProperty('network', {
      url: provider.url,
      chainId: provider.getChainId(),
    });

    api.defaults.headers.common['Authorization'] = session.accessToken;
    api.defaults.headers.common['Signeraddress'] = provider.url;

    // get a route with required auth
    const { data: userInfo } = await api.get(`/user/latest/info`);

    expect(userInfo).toHaveProperty('address', newUser.address);
    expect(userInfo).toHaveProperty('name', newUser.name);
    expect(userInfo).toHaveProperty('network', {
      url: provider.url,
      chainId: provider.getChainId(),
    });

    // change network
    const newNetwork = networks['devnet'];

    // update network
    await api.post(`/user/select-network`, {
      network: newNetwork,
    });

    // console.log('updatedSession', updatedSession);

    const { data: updatedNetwork } = await api.get(`/user/latest/info`);

    const newProvider = await Provider.create(newNetwork);

    expect(updatedNetwork).toHaveProperty('network', {
      url: newProvider.url,
      chainId: newProvider.getChainId(),
    });
  });
});

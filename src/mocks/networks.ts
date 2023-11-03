import { Provider } from 'fuels';

export const netoworks: { [key: string]: string } = {
  beta4: 'https://beta-4.fuel.network/graphql',
  local: 'http://127.0.0.1:4000/graphql',
};

export const providers: { [key: string]: () => Promise<Provider> } = {
  beta4: async () => await Provider.create(netoworks['beta4']),
  local: async () => await Provider.create(netoworks['local']),
};

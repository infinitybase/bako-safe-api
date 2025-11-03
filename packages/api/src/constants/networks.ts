export const networks: { [key: string]: string } = {
  beta5: 'https://beta-5.fuel.network/graphql',
  beta4: 'https://beta-4.fuel.network/graphql',
  local: 'http://127.0.0.1:4000/v1/graphql',
  devnet: 'https://testnet.fuel.network/v1/graphql',
  mainnet: 'https://mainnet.fuel.network/v1/graphql',
};

export const networksByChainId: { [key: string]: string } = {
  '0': 'https://testnet.fuel.network/v1/graphql',
  '9889': 'https://mainnet.fuel.network/v1/graphql',
};

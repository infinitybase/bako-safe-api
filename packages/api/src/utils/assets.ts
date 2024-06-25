export type IAsset = {
  symbol: string;
  slug?: string;
  id: string;
};

export type IAssetMapById = {
  [id: string]: {
    symbol: string;
    slug?: string;
  };
};

export type IAssetMapBySymbol = {
  [symbol: string]: {
    slug?: string;
    id: string;
  };
};

export const assets: IAsset[] = [
  {
    symbol: 'ETH',
    slug: 'ethereum',
    id: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07',
  },
  {
    symbol: 'BTC',
    slug: 'bitcoin',
    id: '0xfe3f96763e20e5d168037065a3bc65b751df7a038fd9297cc1cb5c740fd1c170',
  },
  {
    symbol: 'USDC',
    slug: 'usd-coin',
    id: '0xda1fb840452bba3ab65a11f782902e7286fc44b94a9b85059dd7f8b68bf371d4',
  },
  {
    symbol: 'UNI',
    slug: 'uniswap',
    id: '0xb3238af388ac05188e342b1801db79d358e4a162734511316c937b00c8687fe9',
  },
  {
    symbol: 'DAI',
    id: '0x0d9be25f6bef5c945ce44db64b33da9235fbf1a9f690298698d899ad550abae1',
  },
  {
    symbol: 'sETH',
    id: '0x1bdeed96ee1e5eca0bd1d7eeeb51d03b0202c1faf764fec1b276ba27d5d61d89',
  },
];

export const assetsMapById: IAssetMapById = assets.reduce(
  (previousValue, currentValue) => {
    return {
      ...previousValue,
      [currentValue.id]: {
        symbol: currentValue.symbol,
        slug: currentValue.slug,
      },
    };
  },
  {},
);

export const assetsMapBySymbol: IAssetMapBySymbol = assets.reduce(
  (previousValue, currentValue) => {
    return {
      ...previousValue,
      [currentValue.symbol]: {
        slug: currentValue.slug,
        id: currentValue.id,
      },
    };
  },
  {},
);

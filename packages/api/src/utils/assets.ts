import { IQuote } from '@src/server/storage';

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
    id: '0xccceae45a7c23dcd4024f4083e959a0686a191694e76fa4fb76c449361ca01f7',
  },
  {
    symbol: 'USDC',
    slug: 'usd-coin',
    id: '0xfed3ee85624c79cb18a3a848092239f2e764ed6b0aa156ad10a18bfdbe74269f',
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

export const QuotesMock: IQuote[] = [
  {
    assetId: assetsMapBySymbol['ETH'].id,
    price: 3381.1556815779345,
  },
  {
    assetId: assetsMapBySymbol['BTC'].id,
    price: 61620.37310293032,
  },
  {
    assetId: assetsMapBySymbol['USDC'].id,
    price: 0.9998584312603784,
  },
  {
    assetId: assetsMapBySymbol['UNI'].id,
    price: 9.379567369214598,
  },
];

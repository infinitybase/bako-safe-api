import { IQuote } from '@src/server/storage';
import { assets as fuelAssetsList, NetworkFuel } from 'fuels';

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
export type Asset = {
  name: string;
  slug: string;
  assetId: string;
  icon?: string;
  amount?: string;
  units: number;
};

//const whiteList = ['ethereum', 'weth', 'usd-coin'];
const whitelist = ['rsteth', 'mantle meth', 'rsusde', 're7lrt'];
const replaceList = {
  usdc: 'usd-coin',
};

const replace = (name: string) => {
  return replaceList.hasOwnProperty(name.toLocaleLowerCase())
    ? replaceList[name.toLocaleLowerCase()]
    : name.toLocaleLowerCase();
};

export const fuelAssetsByChainId = (chainId: number): Asset[] =>
  fuelAssetsList.reduce<Asset[]>((acc, asset) => {
    const network = asset.networks.find(
      network => network && network.chainId === chainId,
    ) as NetworkFuel;

    if (network && network.type === 'fuel') {
      acc.push({
        name: asset.name,
        slug: replace(asset.name),
        assetId: network.assetId,
        icon: asset.icon,
        units: network.decimals,
      });
    }
    return acc;
  }, []);

export const fuelUnitAssets = (chainId: number, assetId: string): number => {
  const result =
    fuelAssetsList
      .map(asset => {
        const network = asset.networks.find(
          network => network && network.chainId === chainId,
        ) as NetworkFuel;

        if (network && network.assetId === assetId) return network.decimals;
      })
      .find(units => units !== undefined) ?? 8;

  return result;
};

export const fuelAssets = (): Asset[] =>
  fuelAssetsList.reduce<Asset[]>((acc, asset) => {
    if (whitelist.includes(asset.name.toLocaleLowerCase())) return acc;
    const network = asset.networks.find(
      network => network.type === 'fuel',
    ) as NetworkFuel;
    if (network) {
      acc.push({
        name: asset.name,
        slug: replace(asset.name),
        assetId: network.assetId,
        icon: asset.icon,
        units: network.decimals,
      });
    }
    return acc;
  }, []);

export const assets = fuelAssets().map(asset => {
  return {
    symbol: asset.slug,
    id: asset.assetId,
  };
});

export const assetsMapById: IAssetMapById = fuelAssets().reduce(
  (previousValue, currentValue) => {
    return {
      ...previousValue,
      [currentValue.assetId]: {
        symbol: currentValue.slug,
        slug: currentValue.slug,
      },
    };
  },
  {},
);

export const assetsMapBySymbol: IAssetMapBySymbol = fuelAssets().reduce(
  (previousValue, currentValue) => {
    return {
      ...previousValue,
      [currentValue.slug]: {
        slug: currentValue.slug,
        id: currentValue.assetId,
      },
    };
  },
  {},
);

export const QuotesMock: IQuote[] = Object.entries(assetsMapBySymbol).map(
  ([key, value]) => {
    const price = Math.random() * 100;
    return {
      assetId: value.id,
      price,
    };
  },
);

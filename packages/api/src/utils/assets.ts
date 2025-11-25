import { IQuote } from '@src/server/storage';
import { fetchFuelAssets } from '@src/server/storage/fuelAssetsFetcher';
import { Assets, NetworkFuel } from 'fuels';

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

const blocklist = ['rsteth', 'rsusde', 're7lrt', 'amphreth'];

// Cache para o resultado processado de getAssetsMaps
interface AssetsMapsCache {
  fuelAssetsList: Assets;
  QuotesMock: IQuote[];
  assets: IAsset[];
  assetsMapById: IAssetMapById;
  assetsMapBySymbol: IAssetMapBySymbol;
  fuelUnitAssets: (chainId: number, assetId: string) => number;
}

let assetsMapsCache: AssetsMapsCache | null = null;

export const fuelAssetsByChainId = (
  chainId: number,
  fuelAssetsList: Assets,
): Asset[] => {
  return fuelAssetsList.reduce<Asset[]>((acc, asset) => {
    const network = asset.networks.find(
      network => network && network.chainId === chainId,
    ) as NetworkFuel;

    if (network && network.type === 'fuel') {
      acc.push({
        name: asset.name,
        slug: asset.name,
        assetId: network.assetId,
        icon: asset.icon,
        units: network.decimals,
      });
    }
    return acc;
  }, []);
};

export const handleFuelUnitAssets = (
  fuelAssetsList: Assets,
  chainId: number,
  assetId: string,
): number => {
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

// Parse fuel assets filtrando blocklist
const parseFuelAssets = (fuelAssetsList: Assets): Asset[] => {
  return fuelAssetsList.reduce<Asset[]>((acc, asset) => {
    if (blocklist.includes(asset.name.toLocaleLowerCase())) return acc;

    asset.networks
      .filter(network => network && 'assetId' in network && network.type === 'fuel')
      .forEach((network: NetworkFuel) =>
        acc.push({
          name: asset.name,
          slug: asset.name,
          assetId: network.assetId,
          icon: asset.icon,
          units: network.decimals,
        }),
      );

    return acc;
  }, []);
};

// Converte assets para formato simplificado
const parseAssetsToSimpleFormat = (fuelAssets: Asset[]): IAsset[] => {
  return fuelAssets.map(asset => ({
    symbol: asset.slug,
    id: asset.assetId,
  }));
};

// Cria map de assets por ID
const createAssetsMapById = (fuelAssets: Asset[]): IAssetMapById => {
  return fuelAssets.reduce((previousValue, currentValue) => {
    return {
      ...previousValue,
      [currentValue.assetId]: {
        symbol: currentValue.slug,
        slug: currentValue.slug,
      },
    };
  }, {});
};

// Cria map de assets por símbolo
const createAssetsMapBySymbol = (fuelAssets: Asset[]): IAssetMapBySymbol => {
  return fuelAssets.reduce((previousValue, currentValue) => {
    return {
      ...previousValue,
      [currentValue.slug]: {
        slug: currentValue.slug,
        id: currentValue.assetId,
      },
    };
  }, {});
};

// Gera quotes mock para desenvolvimento
const generateQuotesMock = (assetsMapBySymbol: IAssetMapBySymbol): IQuote[] => {
  return Object.entries(assetsMapBySymbol).map(([key, value]) => {
    const price = Math.random() * 100;
    return {
      assetId: value.id,
      price,
    };
  });
};

export const getAssetsMaps = async (): Promise<AssetsMapsCache> => {
  // Retorna cache se já existir
  if (assetsMapsCache) {
    return assetsMapsCache;
  }

  const fuelAssetsList = await fetchFuelAssets();

  const fuelUnitAssets = (chainId: number, assetId: string): number =>
    handleFuelUnitAssets(fuelAssetsList, chainId, assetId);

  // Parse dos assets usando funções separadas
  const fuelAssets = parseFuelAssets(fuelAssetsList);
  const assets = parseAssetsToSimpleFormat(fuelAssets);
  const assetsMapById = createAssetsMapById(fuelAssets);
  const assetsMapBySymbol = createAssetsMapBySymbol(fuelAssets);
  const QuotesMock = generateQuotesMock(assetsMapBySymbol);

  // Armazena no cache
  assetsMapsCache = {
    fuelAssetsList,
    QuotesMock,
    assets,
    assetsMapById,
    assetsMapBySymbol,
    fuelUnitAssets,
  };

  return assetsMapsCache;
};

// Função para limpar o cache (útil para testes ou refresh manual)
export const clearAssetsMapsCache = () => {
  assetsMapsCache = null;
};

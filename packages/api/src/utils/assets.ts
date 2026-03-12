import { IQuote } from '@src/server/storage';
import { logger } from '@src/config/logger';
import { fetchFuelAssets } from '@src/server/storage/fuelAssetsFetcher';
import { Assets, NetworkFuel } from 'fuels';
import { RedisReadClient } from './redis/RedisReadClient';
import { RedisWriteClient } from './redis/RedisWriteClient';

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

// Redis key for assets cache
const ASSETS_CACHE_KEY = 'assets:maps';
const ASSETS_CACHE_TTL = 60 * 60; // 1 hour

// Interface for data stored in Redis (without functions)
interface AssetsMapsData {
  fuelAssetsList: Assets;
  QuotesMock: IQuote[];
  assets: IAsset[];
  assetsMapById: IAssetMapById;
  assetsMapBySymbol: IAssetMapBySymbol;
}

// Interface returned to callers (with functions)
interface AssetsMapsCache extends AssetsMapsData {
  fuelUnitAssets: (chainId: number, assetId: string) => number;
}

// Local reference to fuelAssetsList for the function (lightweight)
let localFuelAssetsList: Assets | null = null;

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
  // Try to get from Redis first
  try {
    const cached = await RedisReadClient.get(ASSETS_CACHE_KEY);
    if (cached) {
      const data: AssetsMapsData = JSON.parse(cached);
      // Store locally for the function
      localFuelAssetsList = data.fuelAssetsList;

      const fuelUnitAssets = (chainId: number, assetId: string): number =>
        handleFuelUnitAssets(data.fuelAssetsList, chainId, assetId);

      return { ...data, fuelUnitAssets };
    }
  } catch (error) {
    logger.error({ error }, '[AssetsCache] Error reading from Redis');
  }

  // Cache miss - fetch from source
  const fuelAssetsList = await fetchFuelAssets();
  localFuelAssetsList = fuelAssetsList;

  const fuelUnitAssets = (chainId: number, assetId: string): number =>
    handleFuelUnitAssets(fuelAssetsList, chainId, assetId);

  // Parse dos assets usando funções separadas
  const fuelAssets = parseFuelAssets(fuelAssetsList);
  const assets = parseAssetsToSimpleFormat(fuelAssets);
  const assetsMapById = createAssetsMapById(fuelAssets);
  const assetsMapBySymbol = createAssetsMapBySymbol(fuelAssets);
  const QuotesMock = generateQuotesMock(assetsMapBySymbol);

  // Data to store in Redis (without functions)
  const dataToCache: AssetsMapsData = {
    fuelAssetsList,
    QuotesMock,
    assets,
    assetsMapById,
    assetsMapBySymbol,
  };

  // Store in Redis (async, don't block)
  RedisWriteClient.setWithTTL(
    ASSETS_CACHE_KEY,
    JSON.stringify(dataToCache),
    ASSETS_CACHE_TTL,
  ).catch(error => logger.error({ error }, '[AssetsCache] Error writing to Redis'));

  return { ...dataToCache, fuelUnitAssets };
};

// Função para limpar o cache (útil para testes ou refresh manual)
export const clearAssetsMapsCache = async () => {
  localFuelAssetsList = null;
  try {
    await RedisWriteClient.del([ASSETS_CACHE_KEY]);
  } catch (error) {
    logger.error({ error }, '[AssetsCache] Error clearing Redis cache');
  }
};

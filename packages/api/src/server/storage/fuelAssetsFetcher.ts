import { assets, Assets } from 'fuels';
import { logger } from '@src/config/logger';

const ASSETS_URL = 'https://verified-assets.fuel.network/assets.json';

let cachedAssets: Assets | null = null;

export const fetchFuelAssets = async (): Promise<Assets> => {
  if (cachedAssets) {
    return cachedAssets;
  }

  try {
    const response = await fetch(ASSETS_URL);

    if (!response.ok) {
      return assets;
    }

    const data: Assets = await response.json();
    cachedAssets = data;

    return cachedAssets;
  } catch (error) {
    logger.error({ error }, 'Error fetching fuel assets');
    return [] as Assets;
  }
};

export { cachedAssets };

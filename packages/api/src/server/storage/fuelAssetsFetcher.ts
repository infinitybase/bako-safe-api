import { Assets } from 'fuels';

const ASSETS_URL = 'https://verified-assets.fuel.network/assets.json';

let cachedAssets: Assets | null = null;

export const fetchFuelAssets = async (): Promise<Assets> => {
  if (cachedAssets) {
    return cachedAssets;
  }

  try {
    const response = await fetch(ASSETS_URL);

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data: Assets = await response.json();
    cachedAssets = data;

    return cachedAssets;
  } catch (error) {
    console.error('Error fetching fuel assets:', error);
    return [] as Assets;
  }
};

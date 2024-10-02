import axios from 'axios';
import { Assets } from 'fuels';

const ASSETS_URL = 'https://verified-assets.fuel.network/assets.json';

let cachedAssets: Assets | null = null;

export const fetchFuelAssets = async (): Promise<Assets> => {
  if (cachedAssets) {
    return cachedAssets;
  }

  try {
    const response = await axios.get<Assets>(ASSETS_URL);
    cachedAssets = response.data;

    return cachedAssets;
  } catch (error) {
    console.error('Error fetching fuel assets:', error);
    return [];
  }
};

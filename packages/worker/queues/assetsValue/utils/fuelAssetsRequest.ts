import { type Assets, assets, type NetworkFuel } from "fuels";
import { FUEL_ASSETS_URL, QUEUE_ASSET } from "../constants";

const blocklist = ['rsteth', 'rsusde', 're7lrt', 'amphreth'];

const format = (asset: Assets) => {
    return asset.reduce<{
        name: string;
        slug: string;
        assetId: string;
    }[]>((acc, asset) => {
        if (blocklist.includes(asset.name.toLocaleLowerCase())) return acc;
        // biome-ignore lint/complexity/noForEach: <explanation>
        asset.networks
          .filter(
            network => network && 'assetId' in network && network.type === 'fuel',
          )
          .forEach((network: NetworkFuel) =>
            acc.push({
              name: asset.name,
              slug: asset.name,
              assetId: network.assetId,
            }),
          );
  
        return acc;
      }, []);
}


export const fetchFuelAssets = async (): Promise<{
    name: string;
    slug: string;
    assetId: string;
  }[]> => {
    return fetch(FUEL_ASSETS_URL)
      .then(async (response) => {
        if (!response.ok) {
          console.warn(`[${QUEUE_ASSET}] Failed to fetch assets. Returning fallback assets.`);
          return assets; 
        }
        return response.json();
      })
      .catch((error) => {
        console.error(`[${QUEUE_ASSET}] Error fetching fuel assets:`, error);
        return [] as Assets;
      })
      .then((data) => format(data))
  };
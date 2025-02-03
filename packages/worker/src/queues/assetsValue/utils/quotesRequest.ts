import type { Quote } from "../types";
import { fetchFuelAssets } from "./fuelAssetsRequest";

export const fetchQuotes = async (): Promise<Quote[]> => {
  const assets = await fetchFuelAssets();
  const url = `https://mainnet-explorer.fuel.network/assets`;

  const assetsQuote = [];
  for (const asset of assets) {
    const response = await fetch(`${url}/${asset.assetId}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      console.warn(`Failed to fetch assets. Returning fallback assets.`);
      return [];
    }
    const data = await response.json().then(data => data).catch(() => null);
    if (data && data.rate) {
      assetsQuote.push({
        assetId: data.assetId,
        price: data.rate,
      });
    }
  }
  return assetsQuote;
};

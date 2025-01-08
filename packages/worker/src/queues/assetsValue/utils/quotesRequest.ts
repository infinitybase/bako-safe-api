import { COIN_GECKO_API_URL, COIN_MARKET_CAP_API_KEY } from "../constants";
import type { Quote } from "../types";
import { fetchFuelAssets } from "./fuelAssetsRequest";
import { generateParams } from "./paramsGenerate";
import { parseName } from "./replaceNames";

export const fetchQuotes = async (): Promise<Quote[]> => {
    const assets = await fetchFuelAssets();
    const params = new URLSearchParams({ ids:  generateParams(assets) }).toString();
    const url = `${COIN_GECKO_API_URL}${params}`;
  
    const response = await fetch(url, {
      headers: {
        'x-cg-demo-api-key': COIN_MARKET_CAP_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const data = await response.json();

    const aux = assets.map(a => {
      return {
        assetId: a.assetId,
        price: data[parseName(a.name.toLocaleLowerCase())]?.usd ?? 0.0,
      };
    });
  
    return aux;
  };
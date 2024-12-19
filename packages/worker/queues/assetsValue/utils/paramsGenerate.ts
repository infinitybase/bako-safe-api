import type { Asset } from "../types";
import { parseName } from "./replaceNames";

export const generateParams = (assets: Asset[]): string => {
    if (!assets || assets.length === 0) return '';
  
    return assets
      .map(asset => parseName(asset.slug))
      .join(',');
  };
  
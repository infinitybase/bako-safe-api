import { CoinQuantity } from 'fuels';
import { assets } from '@src/mocks/assets';

import axios from 'axios';

const getPriceUSD = async (assetSymbol: string): Promise<number> => {
  try {
    const convert = `${assetSymbol}-USD`;
    const { data } = await axios.get(
      `https://economia.awesomeapi.com.br/last/${convert}`,
    );

    return data[convert.replace('-', '')].bid ?? 0.0;
  } catch (e) {
    console.log('[GET_ASSET_PRICE_USD_ERROR]: ', e);
    return 0.0;
  }
};

const getAssetSymbolByAssetId = (assetId: string): string | undefined => {
  return Object.keys(assets).find(key => assets[key] === assetId);
};

const calculateBalanceUSD = async (balances: CoinQuantity[]): Promise<string> => {
  let balanceUSD = 0.0;

  for await (const balance of balances) {
    const formattedAmount = parseFloat(balance.amount.format().toString());
    const assetSymbol = getAssetSymbolByAssetId(balance.assetId);

    if (assetSymbol) {
      const priceUSD = await getPriceUSD(assetSymbol);
      balanceUSD += formattedAmount * priceUSD;
    }
  }

  return balanceUSD.toFixed(2);
};

export { getPriceUSD, getAssetSymbolByAssetId, calculateBalanceUSD };

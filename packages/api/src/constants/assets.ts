import { hashMessage } from 'fuels';

export const ASSETS = {
  FUEL_ETH: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07',
};

// create a hashMessage for fiat currencies
// The keys are the currency codes, and the values are the asset IDs or other identifiers.
export const FIAT_CURRENCIES = {
  USD: hashMessage('USD'),
  EUR: hashMessage('EUR'),
  BRL: hashMessage('BRL'),
};

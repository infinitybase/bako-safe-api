import {
  RampTransaction,
  RampTransactionProvider,
} from '@src/models/RampTransactions';

export const formatRampTransactionWithMeldProvider = (data: RampTransaction) => {
  return {
    id: data.id,
    provider: data.provider,
    widgetUrl: data.providerData.widgetSessionData.widgetUrl,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export const formatRampTransactionResponse = (data: RampTransaction) => {
  if (data.provider === RampTransactionProvider.MELD) {
    return formatRampTransactionWithMeldProvider(data);
  }
  return data;
};

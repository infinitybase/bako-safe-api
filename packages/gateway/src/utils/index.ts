import { arrayify, Transaction, TransactionCoder, TransactionType } from 'fuels';

export const toTransaction = (txHex: string) => {
  const transactionCoder = new TransactionCoder();
  const [txDecoded] = transactionCoder.decode(arrayify(txHex), 0);

  return txDecoded;
};
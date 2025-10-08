import { TransactionStatusWithRamp } from '@src/models';
import { ErrorTypes, Internal } from '@src/utils/error';
import { TransactionStatus } from 'bakosafe';
import { IMeldTransactionCryptoWeebhook } from '../meld/types';

type Status = IMeldTransactionCryptoWeebhook['payload']['paymentTransactionStatus'];

export const getTransactionStatusByPaymentStatus = (
  status: Status,
): TransactionStatusWithRamp | TransactionStatus => {
  switch (status) {
    case 'PENDING_CREATED':
      return TransactionStatusWithRamp.PENDING_PROVIDER;
    case 'PENDING':
      return TransactionStatusWithRamp.PENDING_PROVIDER;
    case 'SETTLING':
      return TransactionStatusWithRamp.PENDING_PROVIDER;
    case 'SETTLED':
      return TransactionStatus.SUCCESS;
    case 'FAILED':
      return TransactionStatus.FAILED;
    case 'ERROR':
      return TransactionStatus.FAILED;
    default:
      throw new Internal({
        title: 'Invalid payment transaction status',
        detail: `Received an invalid payment transaction status: ${status}`,
        type: ErrorTypes.Internal,
      });
  }
};

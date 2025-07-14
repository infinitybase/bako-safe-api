import { RampTransaction } from '@src/models/RampTransactions';
import { ErrorTypes, Internal, NotFound } from '@src/utils/error';
import { ICreatePayload, IRampTransactionService } from './types';

export default class RampTransactionsService implements IRampTransactionService {
  async create(payload: ICreatePayload): Promise<RampTransaction> {
    try {
      return await RampTransaction.create({
        provider: payload.provider,
        providerData: payload.providerData,
        user: payload.user,
        transaction: payload.transaction,
        sourceCurrency: payload.sourceCurrency,
        sourceAmount: payload.sourceAmount,
        destinationCurrency: payload.destinationCurrency,
        destinationAmount: payload.destinationAmount,
        paymentMethod: payload.paymentMethod,
      }).save();
    } catch (error) {
      throw new Internal({
        title: 'Error creating Ramp Transaction',
        detail: error instanceof Error ? error.message : 'Unknown error',
        type: ErrorTypes.Internal,
      });
    }
  }

  async findById(id: string): Promise<RampTransaction> {
    return RampTransaction.findOne({
      where: { id },
    })
      .then(res => {
        if (!res) {
          throw new NotFound({
            title: 'Ramp Transaction not found',
            detail: `No Ramp Transaction found with id ${id}`,
            type: ErrorTypes.NotFound,
          });
        }
        return res;
      })
      .catch(error => {
        throw new Internal({
          title: 'Error fetching Ramp Transaction',
          detail: error instanceof Error ? error.message : 'Unknown error',
          type: ErrorTypes.Internal,
        });
      });
  }
}

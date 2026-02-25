import { bindMethods, successful } from '@src/utils';
import { error } from '@src/utils/error';
import { IFindRampTransactionByIdRequest, IRampTransactionService } from './types';
import { formatRampTransactionResponse } from './utils';

export default class RampTransactionsController {
  constructor(private rampTransactionService: IRampTransactionService) {
    bindMethods(this);
  }

  async findById(request: IFindRampTransactionByIdRequest) {
    try {
      const { id } = request.params;
      const transaction = await this.rampTransactionService.findById(id);
      return successful(formatRampTransactionResponse(transaction), 200);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }
}

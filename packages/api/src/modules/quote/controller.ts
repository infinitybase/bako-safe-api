import { IQuote } from '@src/server/storage';
import { QuoteService } from './services';
import { IListRequest } from '../transaction/types';
import { error } from '@src/utils/error';
import { bindMethods, Responses, successful } from '@src/utils';

export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {
    bindMethods(this);
  }

  async listAll(_req: IListRequest) {
    try {
      const quotes = await this.quoteService.fetchAllFromRedis();
      return successful(quotes, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

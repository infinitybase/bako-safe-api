import { Responses, bindMethods, successful } from '@src/utils';
import { IListRequest, IPredicateVersionService } from './types';
import { error } from '@src/utils/error';

export class PredicateVersionController {
  private predicateVersionService: IPredicateVersionService;

  constructor(predicateVersionService: IPredicateVersionService) {
    this.predicateVersionService = predicateVersionService;
    bindMethods(this);
  }

  async list(req: IListRequest) {
    const { orderBy, sort, page, perPage, rootAddress, active, q } = req.query;

    try {
      const response = await this.predicateVersionService
        .filter({ rootAddress, active, q })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findCurrentVersion() {
    try {
      const response = await this.predicateVersionService.findCurrentVersion();
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

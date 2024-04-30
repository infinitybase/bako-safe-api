import { Responses, bindMethods, successful } from '@src/utils';
import { IPredicateVersionService } from './types';
import { error } from '@src/utils/error';

export class PredicateVersionController {
  private predicateVersionService: IPredicateVersionService;

  constructor(predicateVersionService: IPredicateVersionService) {
    this.predicateVersionService = predicateVersionService;
    bindMethods(this);
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

import { error } from '@utils/error';
import { Responses, successful, bindMethods } from '@utils/index';

import {
  IAddPredicateRequest,
  IFindByAdressesRequest,
  IFindByIdRequest,
  IPredicateService,
} from './types';

export class PredicateController {
  private predicateService: IPredicateService;

  constructor(predicateService: IPredicateService) {
    this.predicateService = predicateService;
    bindMethods(this);
  }

  async add({ body: predicate }: IAddPredicateRequest) {
    try {
      const response = await this.predicateService.add(predicate);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findAll() {
    try {
      const response = await this.predicateService.findAll();
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findById({ params: { id } }: IFindByIdRequest) {
    try {
      const response = await this.predicateService.findById(Number(id));
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findByAddresses({ params: { addresses } }: IFindByAdressesRequest) {
    try {
      const response = await this.predicateService.findByAdresses(addresses);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

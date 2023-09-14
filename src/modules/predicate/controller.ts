import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import {
  IAddPredicateRequest,
  IFindByAdressesRequest,
  IFindByIdRequest,
  IFindByPredicateAdressRequest,
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
      const response = await this.predicateService
        .ordination()
        .paginate()
        .findAll();
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

  async findByAddresses({ params: { address } }: IFindByAdressesRequest) {
    try {
      const response = await this.predicateService
        .ordination()
        .paginate()
        .findByAdresses(address);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findByPredicateAddress({
    params: { predicateAddress },
  }: IFindByPredicateAdressRequest) {
    try {
      const response = await this.predicateService.findByPredicateAddress(
        predicateAddress,
      );
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

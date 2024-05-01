import { Responses, bindMethods, successful } from '@src/utils';
import {
  ICreateRequest,
  IFindByRootAddressRequest,
  IListRequest,
  IPredicateVersionService,
} from './types';
import { BadRequest, ErrorTypes, error } from '@src/utils/error';
import { PredicateVersion } from '@src/models';

export class PredicateVersionController {
  private predicateVersionService: IPredicateVersionService;

  constructor(predicateVersionService: IPredicateVersionService) {
    this.predicateVersionService = predicateVersionService;
    bindMethods(this);
  }

  async create(req: ICreateRequest) {
    const { body } = req;
    const { rootAddress } = body;

    try {
      const duplicatedPredicateVersion = await PredicateVersion.findOne({
        where: { rootAddress },
        withDeleted: true,
      });

      if (duplicatedPredicateVersion) {
        throw new BadRequest({
          type: ErrorTypes.Create,
          title: 'Error on predicate version creation',
          detail: `Predicate version with root address ${rootAddress} already exists`,
        });
      }

      const response = await this.predicateVersionService.create(body);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
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

  async findByRootAddress(req: IFindByRootAddressRequest) {
    const { rootAddress } = req.params;

    try {
      const response = await this.predicateVersionService.findByRootAddress(
        rootAddress,
      );

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

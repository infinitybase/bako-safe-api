import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import {
  IVaultTemplateService,
  ICreateVaultTemplateRequest,
  ILisVaultTemplatetRequest,
  IUpdateVaultTemplateRequest,
  IFindByIdRequest,
} from './types';

export class VaultTemplateController {
  private vaultTemplateService: IVaultTemplateService;

  constructor(vaultTemplateService: IVaultTemplateService) {
    Object.assign(this, { vaultTemplateService });
    bindMethods(this);
  }

  async create({ body, user }: ICreateVaultTemplateRequest) {
    try {
      const result = await this.vaultTemplateService.create({
        ...body,
        signers: JSON.stringify(body.signers),
        createdBy: user,
      });
      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list(req: ILisVaultTemplatetRequest) {
    const { orderBy, sort, page, perPage, q } = req.query;
    const { user } = req;
    try {
      const response = await this.vaultTemplateService
        .filter({
          user,
          q,
        })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findById(req: IFindByIdRequest) {
    const { id } = req.params;
    try {
      const response = await this.vaultTemplateService.findById(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async update(req: IUpdateVaultTemplateRequest) {
    try {
      const { id } = req.params;
      const { body } = req;

      const response = await this.vaultTemplateService.update(id, body);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

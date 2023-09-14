import { ModulesList } from '@middlewares/permissions/types';

import { error } from '@utils/error';
import { successful, Responses, bindMethods } from '@utils/index';

import {
  IUpdateRequest,
  IListRequest,
  ICreateRequest,
  IFindOneRequest,
  IDeleteRequest,
  IRoleService,
} from './types';

export class RoleController {
  private roleService: IRoleService;

  constructor(roleService: IRoleService) {
    this.roleService = roleService;
    bindMethods(this);
  }

  async create(req: ICreateRequest) {
    try {
      const { name, active, permissions } = req.body;

      const response = await this.roleService.create({ name, active, permissions });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async find(req: IListRequest) {
    try {
      const { role, active, page, perPage, orderBy, sort } = req.query;

      const response = await this.roleService
        .filter({ role, active })
        .ordination({ orderBy, sort })
        .paginate({
          page,
          perPage,
        })
        .find();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findOne(req: IFindOneRequest) {
    try {
      const { id } = req.params;

      const response = await this.roleService.findOne(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async update(req: IUpdateRequest) {
    try {
      const { id } = req.params;
      const { name, active, permissions } = req.body;

      const response = await this.roleService.update(id, {
        name,
        active,
        permissions,
      });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async delete(req: IDeleteRequest) {
    try {
      const { id } = req.params;

      const response = await this.roleService.delete(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findModules() {
    try {
      return successful(ModulesList, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

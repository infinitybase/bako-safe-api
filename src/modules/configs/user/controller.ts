import { bindMethods } from '@src/utils/bindMethods';
import error from '@src/utils/error';
import successful, { Responses } from '@src/utils/successful';

import {
  ICreateRequest,
  IDeleteRequest,
  IFindOneRequest,
  IListRequest,
  IUpdateRequest,
  IUserService,
} from './types';

export class UserController {
  private userService: IUserService;

  constructor(userService: IUserService) {
    this.userService = userService;
    bindMethods(this);
  }

  async find(req: IListRequest) {
    try {
      const { user, active, orderBy, sort, page, perPage } = req.query;

      const response = await this.userService
        .filter({ user, active })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .find();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async create(req: ICreateRequest) {
    try {
      const { name, email, password, active, language, role } = req.body;

      const response = await this.userService.create({
        name,
        email,
        password,
        active,
        language,
        role,
      });

      return successful(response, Responses.Created);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async findOne(req: IFindOneRequest) {
    try {
      const { id } = req.params;

      const response = await this.userService.findOne(parseInt(id));

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async update(req: IUpdateRequest) {
    try {
      const { id } = req.params;

      const response = await this.userService.update(parseInt(id), {
        ...req.body,
      });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async delete(req: IDeleteRequest) {
    try {
      const { id } = req.params;
      const response = await this.userService.delete(parseInt(id));

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

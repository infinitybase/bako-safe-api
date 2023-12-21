import { SaveOptions, RemoveOptions } from 'typeorm';

import {
  PermissionRoles,
  Workspace,
  defaultPermissions,
} from '@src/models/Workspace';
import { bindMethods } from '@src/utils/bindMethods';

import { error } from '@utils/error';
import { Responses, successful } from '@utils/index';

import { ServiceWorkspace } from '../workspace/services';
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
      console.log('[CREATE_REQUEST]: ', req.body);
      const { address } = req.body;
      const existingUser = await this.userService.findByAddress(address);

      if (existingUser) return successful(existingUser, Responses.Created);

      const response = await this.userService.create({
        ...req.body,
        avatar: await this.userService.randomAvatar(),
      });
      await new ServiceWorkspace()
        .create({
          name: `singleWorkspace[${response.id}]`,
          owner: response,
          avatar: await this.userService.randomAvatar(),
          permissions: {
            [response.id]: defaultPermissions[PermissionRoles.OWNER],
          },
          single: true,
        })
        .then(item => console.log(item));

      return successful(response, Responses.Created);
    } catch (e) {
      console.log(e);
      return error(e.error, e.statusCode);
    }
  }

  async findOne(req: IFindOneRequest) {
    try {
      const { id } = req.params;

      const response = await this.userService.findOne(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async update(req: IUpdateRequest) {
    try {
      const { id } = req.params;

      const response = await this.userService.update(id, {
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
      const response = await this.userService.delete(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

import { User } from '@src/models';
import {
  PermissionRoles,
  Workspace,
  defaultPermissions,
} from '@src/models/Workspace';

import { error } from '@utils/error';
import { Responses, successful } from '@utils/index';

import { UserService } from '../user/service';
import { WorkspaceService } from './services';
import { ICreateRequest, IListByUserRequest } from './types';

export class WorkspaceController {
  async listByUser(req: IListByUserRequest) {
    try {
      const { user } = req.params;

      const response = await new WorkspaceService()
        .filter({ user, single: false })
        .list()
        .then((response: Workspace[]) =>
          WorkspaceService.formatToUnloggedUser(response),
        );

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async create(req: ICreateRequest) {
    try {
      const { user } = req;
      const { permissions, members } = req.body;
      const _members: User[] = [];
      if (members) {
        for await (const member of members) {
          _members.push(await new UserService().findOne(member));
        }
      }

      const response = await new WorkspaceService().create({
        ...req.body,
        owner: user,
        members: [..._members, user],
        permissions: permissions ?? {
          [user.id]: defaultPermissions[PermissionRoles.OWNER],
        },
      });

      return successful(response, Responses.Created);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findById(req: IListByUserRequest) {
    try {
      const { id } = req.params;

      const response = await new WorkspaceService()
        .filter({
          id,
        })
        .list()
        .then((response: Workspace[]) => response[0]);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

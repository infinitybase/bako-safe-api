import { Workspace } from '@src/models/Workspace';

import { error } from '@utils/error';
import { Responses, successful } from '@utils/index';

import { WorkspaceService } from './services';
import { IListByUserRequest } from './types';

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
      console.log(e);
      return error(e.error, e.statusCode);
    }
  }
}

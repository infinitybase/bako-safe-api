import { Predicate, Transaction } from '@src/models';
import { PermissionRoles, defaultPermissions } from '@src/models/Workspace';
import { bindMethods } from '@src/utils/bindMethods';
import { IPagination, Pagination } from '@src/utils/pagination';

import { error } from '@utils/error';
import { Responses, successful } from '@utils/index';

import { PredicateService } from '../predicate/services';
import { TransactionService } from '../transaction/services';
import { WorkspaceService } from '../workspace/services';
import {
  ICreateRequest,
  IDeleteRequest,
  IFindOneRequest,
  IListRequest,
  IMeRequest,
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

  async me(req: IMeRequest) {
    try {
      //list all 8 last vaults of user
      const { workspace } = req;
      const predicates = await new PredicateService()
        .filter({
          workspace: workspace.id,
        })
        .paginate({ page: '1', perPage: '8' })
        .ordination({ orderBy: 'createdAt', sort: 'DESC' })
        .list()
        .then(async (response: IPagination<Predicate>) => {
          return response.data;
        });

      const transactions = await new TransactionService()
        .filter({
          workspaceId: workspace.id,
        })
        .paginate({ page: '1', perPage: '8' })
        .ordination({ orderBy: 'updatedAt', sort: 'DESC' })
        .list()
        .then(async (response: IPagination<Transaction>) => {
          return response.data;
        });

      return successful(
        {
          predicates,
          transactions,
        },
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async create(req: ICreateRequest) {
    try {
      const { address } = req.body;
      const existingUser = await this.userService.findByAddress(address);

      if (existingUser) return successful(existingUser, Responses.Created);

      const response = await this.userService.create({
        ...req.body,
        avatar: await this.userService.randomAvatar(),
      });
      await new WorkspaceService().create({
        name: `singleWorkspace[${response.id}]`,
        owner: response,
        members: [response],
        avatar: await this.userService.randomAvatar(),
        permissions: {
          [response.id]: defaultPermissions[PermissionRoles.OWNER],
        },
        single: true,
      });

      return successful(response, Responses.Created);
    } catch (e) {
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

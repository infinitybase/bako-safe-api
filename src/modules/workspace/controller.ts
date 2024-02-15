import axios from 'axios';
import { Vault, defaultConfigurable } from 'bsafe';
import { BN, Provider, bn } from 'fuels';
import { parse } from 'path';

import { Predicate, User } from '@src/models';
import {
  PermissionRoles,
  Workspace,
  defaultPermissions,
} from '@src/models/Workspace';
import Internal from '@src/utils/error/Internal';
import {
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error/Unauthorized';

import { ErrorTypes, error } from '@utils/error';
import { Responses, successful } from '@utils/index';

import { PredicateService } from '../predicate/services';
import { UserService } from '../user/service';
import { WorkspaceService } from './services';
import {
  ICreateRequest,
  IGetBalanceRequest,
  IListByUserRequest,
  IUpdateMembersRequest,
  IUpdatePermissionsRequest,
  IUpdateRequest,
} from './types';

export class WorkspaceController {
  async listByUser(req: IListByUserRequest) {
    try {
      const { user } = req;

      const response = await new WorkspaceService()
        .filter({ user: user.id, single: false })
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
      const { members = [] } = req.body;

      const {
        _members,
        _permissions,
      } = await new WorkspaceService().includeMembers(members, req.user);

      const response = await new WorkspaceService().create({
        ...req.body,
        owner: user,
        members: _members,
        permissions: _permissions,
        single: false,
        avatar: await new UserService().randomAvatar(),
      });

      return successful(response, Responses.Created);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  // todo: implement this by other coins, and use utils of bsafe-sdk
  async getBalance(req: IGetBalanceRequest) {
    try {
      const { workspace } = req;
      const predicateService = new PredicateService();
      const balance = await Predicate.find({
        where: {
          workspace: workspace.id,
        },
        select: ['id'],
      }).then(async (response: Predicate[]) => {
        let _balance: BN = bn(0);
        for await (const predicate of response) {
          const vault = await predicateService.instancePredicate(predicate.id);
          _balance = _balance.add(await vault.getBalance());
        }
        return _balance;
      });

      const priceUSD = await axios
        .get(
          'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=BTC,USD,EUR',
        )
        .then(({ data }) => {
          return data.USD;
        })
        .catch(() => 0.0);

      const balanceUSD = parseFloat(balance.format().toString()) * priceUSD;

      return successful(
        {
          balance: balance.format().toString(),
          balanceUSD: balanceUSD.toFixed(2),
        },
        Responses.Ok,
      );
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

  async update(req: IUpdateRequest) {
    try {
      const { id } = req.params;

      const response = await new WorkspaceService()
        .update({
          ...req.body,
          id,
        })
        .then(async () => {
          return await new WorkspaceService()
            .filter({ id })
            .list()
            .then(data => data[0]);
        });
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async updatePermissions(req: IUpdatePermissionsRequest) {
    try {
      const { id, member } = req.params;
      const { permissions } = req.body;

      const response = await new WorkspaceService()
        .filter({ id })
        .list()
        .then(async (data: Workspace[]) => {
          if (!data) {
            throw new Internal({
              type: ErrorTypes.NotFound,
              title: 'Workspace not found',
              detail: `Workspace ${id} not found`,
            });
          }
          const workspace = data[0];
          if (workspace.owner.id === member) {
            throw new Unauthorized({
              type: ErrorTypes.Unauthorized,
              title: UnauthorizedErrorTitles.MISSING_PERMISSION,
              detail: `Owner cannot change his own permissions`,
            });
          }

          workspace.permissions = {
            ...workspace.permissions,
            [member]: permissions,
          };

          return await workspace.save();
        });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async addMember(req: IUpdateMembersRequest) {
    try {
      const { id, member } = req.params;
      const workspace = await new WorkspaceService()
        .filter({ id })
        .list()
        .then(data => {
          if (!data) {
            throw new Internal({
              type: ErrorTypes.NotFound,
              title: 'Workspace not found',
              detail: `Workspace ${id} not found`,
            });
          }
          return data[0];
        });

      const _member =
        member.length <= 36
          ? await new UserService().findOne(member)
          : await new UserService()
              .findByAddress(member)
              .then(async (data: User) => {
                if (!data) {
                  return await new UserService().create({
                    address: member,
                    provider: defaultConfigurable['provider'],
                    avatar: await new UserService().randomAvatar(),
                  });
                }
                return data;
              });

      if (!workspace.members.find(m => m.id === _member.id)) {
        workspace.members = [...workspace.members, _member];
        workspace.permissions[_member.id] =
          defaultPermissions[PermissionRoles.VIEWER];
      }

      return successful(await workspace.save(), Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async removeMember(req: IUpdateMembersRequest) {
    try {
      const { id, member } = req.params;
      const workspace = await new WorkspaceService()
        .filter({ id })
        .list()
        .then(data => {
          if (!data) {
            throw new Internal({
              type: ErrorTypes.NotFound,
              title: 'Workspace not found',
              detail: `Workspace ${id} not found`,
            });
          }
          if (data[0].owner.id === member) {
            throw new Unauthorized({
              type: ErrorTypes.Unauthorized,
              title: UnauthorizedErrorTitles.MISSING_PERMISSION,
              detail: `Owner cannot be removed from workspace`,
            });
          }
          return data[0];
        });

      workspace.members = workspace.members.filter(m => m.id !== member);
      delete workspace.permissions[member];

      return successful(await workspace.save(), Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

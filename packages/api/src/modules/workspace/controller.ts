import axios from 'axios';
import { BakoSafe } from 'bakosafe';
import { BN, bn } from 'fuels';

import { Predicate, TypeUser, User, PermissionAccess } from '@src/models';
import { PermissionRoles, Workspace } from '@src/models/Workspace';
import Internal from '@src/utils/error/Internal';
import {
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error/Unauthorized';
import { IconUtils } from '@src/utils/icons';

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
        avatar: IconUtils.workspace(),
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
      const balance = await predicateService
        .filter({
          workspace: [workspace.id],
        })
        .list()
        .then(async (response: Predicate[]) => {
          let _balance: BN = bn(0);
          for await (const predicate of response) {
            const vault = await predicateService.instancePredicate(predicate.id);
            _balance = _balance.add(await vault.getBalance());
          }
          return _balance;
        })
        .catch(e => {
          console.log(e);
          throw new Internal({
            type: ErrorTypes.Internal,
            title: 'Error on get balance',
            detail: e,
          });
        });

      const convert = `ETH-USD`;

      const priceUSD: number = await axios
        .get(`https://economia.awesomeapi.com.br/last/${convert}`)
        .then(({ data }) => {
          // console.log(
          //   data,
          //   data[convert.replace('-', '')].bid ?? 0.0,
          //   balance.format().toString(),
          // );
          return data[convert.replace('-', '')].bid ?? 0.0;
        })
        .catch(e => {
          console.log('[WORKSPACE_REQUEST_BALANCE_ERROR]: ', e);
          return 0.0;
        });

      return successful(
        {
          balance: balance.format().toString(),
          balanceUSD: (parseFloat(balance.format().toString()) * priceUSD).toFixed(
            2,
          ),
          workspaceId: workspace.id,
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
      const {
        workspace: { id },
      } = req;

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
      const { member } = req.params;
      const { permissions } = req.body;
      const {
        workspace: { id },
      } = req;

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

          const memberPermission = workspace.permissions[member];
          const signerPermission = memberPermission?.[PermissionRoles.SIGNER];

          // update user permissions expect signer object
          workspace.permissions = {
            ...workspace.permissions,
            [member]: {
              ...permissions,
              [PermissionRoles.SIGNER]: signerPermission ?? [PermissionAccess.NONE],
            },
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
      const { member } = req.params;
      const {
        workspace: { id },
      } = req;

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
        })
        .catch(e => {
          throw e;
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
                    name: member,
                    provider: BakoSafe.getProviders('CHAIN_URL'),
                    avatar: IconUtils.user(),
                    type: TypeUser.FUEL,
                  });
                }
                return data;
              });

      if (!workspace.members.find(m => m.id === _member.id)) {
        workspace.members = [...workspace.members, _member];
      }

      return successful(await workspace.save(), Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async removeMember(req: IUpdateMembersRequest) {
    try {
      const { member } = req.params;
      const {
        workspace: { id },
      } = req;

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

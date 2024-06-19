import { Asset, BakoSafe, TransactionStatus } from 'bakosafe';

import {
  Predicate,
  TypeUser,
  User,
  PermissionAccess,
  Transaction,
  Asset as AssetModel,
} from '@src/models';
import { PermissionRoles, Workspace } from '@src/models/Workspace';
import Internal from '@src/utils/error/Internal';
import {
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error/Unauthorized';
import { IconUtils } from '@src/utils/icons';

import { ErrorTypes, error } from '@utils/error';
import {
  Responses,
  calculateBalanceUSD,
  subtractReservedCoinsFromBalances,
  successful,
} from '@utils/index';

import { PredicateService } from '../predicate/services';
import { UserService } from '../user/service';
import { WorkspaceService } from './services';
import { TransactionService } from '../transaction/services';
import {
  ICreateRequest,
  IGetBalanceRequest,
  IListByUserRequest,
  IUpdateMembersRequest,
  IUpdatePermissionsRequest,
  IUpdateRequest,
} from './types';
import { CoinQuantity, bn } from 'fuels';
import { assets } from '@src/mocks/assets';

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
      const transactionService = new TransactionService();
      const predicatesBalance = [];
      let reservedCoins: CoinQuantity[] = [];

      await Predicate.find({
        where: {
          workspace: workspace.id,
        },
        select: ['id'],
      }).then(async (response: Predicate[]) => {
        for await (const predicate of response) {
          const vault = await predicateService.instancePredicate(predicate.id);
          predicatesBalance.push(...(await vault.getBalances()));
        }

        // Calculates amount of coins reserved per asset
        const predicateIds = response.map(item => item.id);
        reservedCoins = await transactionService
          .filter({
            predicateId: predicateIds,
          })
          .list()
          .then((data: Transaction[]) => {
            return data
              .filter(
                (transaction: Transaction) =>
                  transaction.status === TransactionStatus.AWAIT_REQUIREMENTS ||
                  transaction.status === TransactionStatus.PENDING_SENDER,
              )
              .reduce((accumulator, transaction: Transaction) => {
                transaction.assets.forEach((asset: AssetModel) => {
                  const assetId = asset.assetId;
                  const amount = bn.parseUnits(asset.amount);
                  const existingAsset = accumulator.find(
                    item => item.assetId === assetId,
                  );

                  if (existingAsset) {
                    existingAsset.amount = existingAsset.amount.add(amount);
                  } else {
                    accumulator.push({ assetId, amount });
                  }
                });
                return accumulator;
              }, [] as CoinQuantity[]);
          })
          .catch(() => {
            return [
              { assetId: assets.ETH, amount: bn.parseUnits('0') },
            ] as CoinQuantity[];
          });
      });

      // Calculate balance per asset
      const formattedPredicatesBalance = predicatesBalance.map(item => ({
        ...item,
        amount: item.amount.format(),
      }));
      const assetsBalance = await Asset.assetsGroupById(formattedPredicatesBalance);
      const formattedAssetsBalance = Object.entries(assetsBalance).map(
        ([assetId, amount]) => ({
          assetId,
          amount,
        }),
      );

      // Subtracts the amount of coins reserved per asset from the balance per asset
      const availableAssetsBalance =
        reservedCoins.length > 0
          ? subtractReservedCoinsFromBalances(formattedAssetsBalance, reservedCoins)
          : formattedAssetsBalance;

      return successful(
        {
          balanceUSD: await calculateBalanceUSD(availableAssetsBalance),
          workspaceId: workspace.id,
          assetsBalance: availableAssetsBalance,
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

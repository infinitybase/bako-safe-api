import { addMinutes } from 'date-fns';

import {
  Predicate,
  RecoverCode,
  RecoverCodeType,
  TransactionStatus,
  TransactionType,
} from '@src/models';
import { User } from '@src/models/User';
import { bindMethods } from '@src/utils/bindMethods';

import {
  BadRequest,
  error,
  ErrorTypes,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@utils/error';
import { IconUtils } from '@utils/icons';
import { getAssetsMaps, Responses, successful, TokenUtils } from '@utils/index';

import App from '@src/server/app';
import { FuelProvider } from '@src/utils/FuelProvider';
import { Not } from 'typeorm';
import { IChangenetworkRequest } from '../auth/types';
import { PredicateService } from '../predicate/services';
import { PredicateWithHidden } from '../predicate/types';
import { RecoverCodeService } from '../recoverCode/services';
import { TransactionService } from '../transaction/services';
import { mergeTransactionLists } from '../transaction/utils';
import { UserService } from './service';
import {
  IAllocationRequest,
  ICheckHardwareRequest,
  ICheckNicknameRequest,
  ICheckUserBalancesRequest,
  ICreateRequest,
  IDeleteRequest,
  IFindByNameRequest,
  IFindOneRequest,
  IListRequest,
  IListUserTransactionsRequest,
  IMeInfoRequest,
  IMeRequest,
  IUpdateRequest,
  IUserService,
} from './types';
import { logger } from '@src/config/logger';

export class UserController {
  constructor(
    private userService: IUserService,
    private transactionService: TransactionService,
  ) {
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
      return error(e.error, e.statusCode);
    }
  }

  async info(req: IListRequest) {
    const { user } = req;

    return successful(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        first_login: user.first_login,
        notify: user.notify,
      },
      Responses.Ok,
    );
  }

  async meTransactions(req: IListUserTransactionsRequest) {
    try {
      const { type, status, offsetDb, offsetFuel, perPage } = req.query;
      const { user, network } = req;

      const ordination = { orderBy: 'createdAt', sort: 'DESC' } as const;

      const transactions = await this.transactionService
        .filter({
          type,
          signer: user.address,
          network: network.url,
          status,
        })
        .transactionPaginate({ offsetDb, offsetFuel, perPage })
        .ordination(ordination)
        .listWithIncomings();

      const shouldFetchFuelTxs =
        (type === TransactionType.DEPOSIT || !type) &&
        (status
          ? !status.find(item => item === TransactionStatus.AWAIT_REQUIREMENTS) // dont fetch fuel txs if filtering by AWAIT_REQUIREMENTS status
          : true);

      let fuelTxs = [];
      if (shouldFetchFuelTxs) {
        const predicates = await new PredicateService()
          .filter({
            owner: user.id,
          })
          // get the latest used predicates
          .paginate({ page: '0', perPage: '6' })
          .ordination({ orderBy: 'updatedAt', sort: 'DESC' })
          .list()
          .then(res => (Array.isArray(res) ? res : res.data));

        fuelTxs = await this.transactionService
          .transactionPaginate({
            perPage,
            offsetDb,
            offsetFuel,
          })
          .fetchFuelTransactions(predicates, network.url);
      }

      const response = mergeTransactionLists(transactions, fuelTxs, {
        offsetDb,
        offsetFuel,
        ordination,
        perPage,
      });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error ?? e, e.statusCode);
    }
  }

  async latestInfo(req: IMeInfoRequest) {
    const { user, workspace, network } = req;
    return successful(
      {
        ...user,
        network,
        onSingleWorkspace:
          workspace.single && workspace.name.includes(`[${user.id}]`),
        workspace: {
          ...workspace,
          permission: workspace.permissions[user.id],
        },
      },
      Responses.Ok,
    );
  }

  async predicates(req: IMeRequest) {
    try {
      const { workspace, user } = req;
      const { workspaceList, hasSingle } = await new UserService().workspacesByUser(
        workspace,
        user,
      );

      const predicates = await new PredicateService()
        .filter({
          workspace: workspaceList,
          signer: hasSingle ? user.address : undefined,
          hidden: false,
          userId: user.id,
        })
        .paginate({ page: '0', perPage: '8' })
        .ordination({ orderBy: 'updatedAt', sort: 'DESC' })
        .list();

      const addHiddenFlag = (vault: Predicate): PredicateWithHidden => ({
        ...vault,
        isHidden: vault.isHiddenForUser(user),
      });

      let processedResponse;

      if ('data' in predicates) {
        const enhancedData = predicates.data.map(addHiddenFlag);
        processedResponse = {
          ...predicates,
          data: enhancedData,
        };
      } else {
        const enhancedData = predicates.map(addHiddenFlag);
        processedResponse = {
          ...predicates,
          data: enhancedData,
        };
      }

      return successful(
        {
          predicates: processedResponse,
        },
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async tokensUSDAmount() {
    try {
      const response = await this.userService.tokensUSDAmount();

      if (response && Object.keys(response).length === 0) {
        return successful([], Responses.Ok);
      }

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async getByName(req: IFindByNameRequest) {
    try {
      const { nickname } = req.params;

      const userWebAuthn = await this.userService.findByName(nickname);
      const response = userWebAuthn ?? {};

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async validateName(req: ICheckNicknameRequest) {
    try {
      const { nickname } = req.params;
      const { userId } = req.query;

      const user = await this.userService.validateName(nickname, userId);
      const response = user ?? {};

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  //verify used name
  async create(req: ICreateRequest) {
    try {
      const { address, name, provider } = req.body;

      //verify user exists
      let existingUser = await this.userService.findByAddress(address);

      if (!existingUser) {
        //verify name exists
        const existingName = await User.findOne({ where: { name } });
        if (name && existingName) {
          throw new BadRequest({
            type: ErrorTypes.Create,
            title: 'Error on user create',
            detail: `User with name ${name} already exists`,
          });
        }

        //create
        existingUser = await this.userService.create({
          ...req.body,
          address,
          name: name ?? address,
          avatar: IconUtils.user(),
        });
      }

      const _provider = await FuelProvider.create(
        provider ?? process.env.FUEL_PROVIDER,
      );

      const localAddTime = process.env.API_ENVIRONMENT === 'development' ? 180 : 0;

      const code = await new RecoverCodeService()
        .create({
          owner: existingUser,
          type: RecoverCodeType.AUTH,
          origin: req.headers.origin ?? process.env.UI_URL,
          // todo: validate this info about the time UTC -3horas
          validAt: addMinutes(new Date(), localAddTime + 5), //todo: change this number to dynamic
          network: {
            url: _provider.url,
            chainId: await _provider.getChainId(),
          },
        })
        .then((data: RecoverCode) => {
          const { owner, ...rest } = data;
          return {
            ...rest,
            userId: owner.id,
          };
        });

      return successful(code, Responses.Created);
    } catch (e) {
      logger.error({ error: e }, '[USER_CREATE]');
      return error(e.error, e.statusCode);
    }
  }

  async getByHardware(req: ICheckHardwareRequest) {
    try {
      const { hardware } = req.params;

      const result = await User.query(
        `SELECT name FROM "users" WHERE webauthn->>'hardware' = $1`,
        [hardware],
      );

      return successful(result, Responses.Ok);
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
      return error(e.error, e.statusCode);
    }
  }

  async update(req: IUpdateRequest) {
    try {
      const { user } = req;
      const { id } = req.params;
      const { name } = req.body;
      const { authorization: sessionId } = req.headers;

      if (user.id !== id) {
        throw new Unauthorized({
          type: ErrorTypes.Update,
          title: UnauthorizedErrorTitles.INVALID_PERMISSION,
          detail: `User id ${user.id} is not allowed to update user id ${id}`,
        });
      }

      if (name) {
        const existingUser = await User.findOne({
          where: { name, id: Not(user.id) },
        });

        if (existingUser) {
          throw new BadRequest({
            type: ErrorTypes.Update,
            title: 'Error on user update',
            detail: `User with name ${name} already exists`,
          });
        }
      }

      const response = await this.userService.update(id, {
        ...req.body,
      });

      await App.getInstance()._sessionCache.updateSession(sessionId);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async delete(req: IDeleteRequest) {
    try {
      const { id } = req.params;
      const response = await this.userService.delete(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async changeNetwork({ user, body }: IChangenetworkRequest) {
    const { network } = body;
    const updatedNetwork = await TokenUtils.changeNetwork(user.id, network);

    return successful(updatedNetwork, Responses.Ok);
  }

  async listAll(req: IListRequest) {
    try {
      const { page, perPage } = req.query;
      const response = await this.userService
        .paginate({ page: page || '0', perPage: perPage || '30' })
        .listAll();
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async wallet(req: IMeRequest) {
    try {
      const { user } = req;

      const personalVault = await Predicate.findOne({
        where: {
          owner: { id: user.id },
          root: true,
        },
      });

      if (!personalVault) {
        return successful(
          {
            message: 'Personal vault not found',
            wallet: null,
          },
          Responses.Ok,
        );
      }

      return successful(
        {
          address: personalVault.predicateAddress,
          configurable: personalVault.configurable,
          version: personalVault.version,
        },
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async allocation({ user, network, query }: IAllocationRequest) {
    try {
      const { limit } = query;

      const allocation = await new PredicateService().allocation({
        user,
        network,
        assetsMap: (await getAssetsMaps()).assetsMapById,
        limit,
      });

      return successful(allocation, Responses.Ok);
    } catch (e) {
      return error(e.error ?? e, e.statusCode);
    }
  }

  async checkUserBalances({ user, workspace, network }: ICheckUserBalancesRequest) {
    try {
      await this.userService.checkBalances({
        userId: user.id,
        workspaceId: workspace.id,
        network,
      });
      return successful(null, Responses.Ok);
    } catch (e) {
      return error(e.error || e, e.statusCode);
    }
  }
}

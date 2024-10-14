import { addMinutes } from 'date-fns';

import { RecoverCode, RecoverCodeType } from '@src/models';
import { User } from '@src/models/User';
import { bindMethods } from '@src/utils/bindMethods';

import {
  BadRequest,
  ErrorTypes,
  Unauthorized,
  UnauthorizedErrorTitles,
  error,
} from '@utils/error';
import { IconUtils } from '@utils/icons';
import { Responses, successful, TokenUtils } from '@utils/index';

import { PredicateService } from '../predicate/services';
import { RecoverCodeService } from '../recoverCode/services';
import { TransactionService } from '../transaction/services';
import { UserService } from './service';
import {
  ICheckHardwareRequest,
  ICheckNicknameRequest,
  ICreateRequest,
  IDeleteRequest,
  IFindOneRequest,
  IListRequest,
  IMeInfoRequest,
  IMeRequest,
  IUpdateRequest,
  IUserService,
} from './types';
import { Not } from 'typeorm';
import app from '@src/server/app';
import { Provider } from 'fuels';
import { IChangenetworkRequest } from '../auth/types';

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

  async meTransactions(req: IMeRequest) {
    try {
      const { type } = req.query;
      const { workspace, user, network } = req;

      const { hasSingle } = await new UserService().workspacesByUser(
        workspace,
        user,
      );
      const transactions = await new TransactionService()
        .filter({
          type,
          workspaceId: [workspace.id],
          signer: hasSingle ? user.address : undefined,
          network: network.url,
        })
        .paginate({ page: '0', perPage: '6' })
        .ordination({ orderBy: 'createdAt', sort: 'DESC' })
        .list();

      return successful(
        transactions,

        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async latestInfo(req: IMeInfoRequest) {
    const { user, workspace, network } = req;
    return successful(
      {
        id: user.id,
        name: user.name,
        type: user.type,
        avatar: user.avatar,
        address: user.address,
        webauthn: user.webauthn,
        first_login: user.first_login,
        network,
        onSingleWorkspace:
          workspace.single && workspace.name.includes(`[${user.id}]`),
        workspace: {
          id: workspace.id,
          name: workspace.name,
          avatar: workspace.avatar,
          single: workspace.single,
          description: workspace.description,
          permission: workspace.permissions[user.id],
        },
      },
      Responses.Ok,
    );
  }

  async predicates(req: IMeRequest) {
    try {
      //list all 8 last vaults of user
      const { workspace, user } = req;
      const { workspaceList, hasSingle } = await new UserService().workspacesByUser(
        workspace,
        user,
      );

      const predicates = await new PredicateService()
        .filter({
          workspace: workspaceList,
          signer: hasSingle ? user.address : undefined,
        })
        .paginate({ page: '0', perPage: '8' })
        .ordination({ orderBy: 'updatedAt', sort: 'DESC' })
        .list();

      return successful(
        {
          predicates,
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
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  /* - add new request veryfi name disponibility /user/name:name
   *      - returns true if exists or false if not
   */

  async validateName(req: ICheckNicknameRequest) {
    try {
      const { nickname } = req.params;
      const response = await User.findOne({
        where: { name: nickname },
      })
        .then(response => {
          const { first_login, notify, active, email, ...rest } = response;
          return rest;
        })
        .catch(e => {
          return {};
        });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  //verify used name
  async create(req: ICreateRequest) {
    try {
      const { address, name, provider } = req.body;
      const { network } = req;

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

      const _provider = await Provider.create(
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
            chainId: _provider.getChainId(),
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
      console.log(e);
      return error(e.error, e.statusCode);
    }
  }

  async getByHardware(req: ICheckHardwareRequest) {
    try {
      const { hardware } = req.params;

      const result = await User.query(
        `SELECT * FROM "users" WHERE webauthn->>'hardware' = $1`,
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

      await app._sessionCache.updateSession(sessionId);

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
    const result = await TokenUtils.changeNetwork(user.id, network);

    return successful(!!result, Responses.Ok);
  }
}

import { th } from 'date-fns/locale';
import { Address } from 'fuels';

import { User } from '@src/models/User';
import { bindMethods } from '@src/utils/bindMethods';
import Internal from '@src/utils/error/Internal';

import { ErrorTypes, error } from '@utils/error';
import { Responses, successful } from '@utils/index';

import { PredicateService } from '../predicate/services';
import { TransactionService } from '../transaction/services';
import { UserService } from './service';
import {
  ICreateRequest,
  IDeleteRequest,
  IFindOneRequest,
  IListRequest,
  IMeRequest,
  IUpdateRequest,
  IUserService,
  ICheckNicknameRequest,
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

  async me(req: IMeRequest) {
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

      const transactions = await new TransactionService()
        .filter({
          workspaceId: workspaceList,
          signer: hasSingle ? user.address : undefined,
        })
        .paginate({ page: '0', perPage: '6' })
        .ordination({ orderBy: 'createdAt', sort: 'DESC' })
        .list();

      return successful(
        {
          workspace: {
            id: workspace.id,
            name: workspace.name,
            avatar: workspace.avatar,
            owner: workspace.owner,
            description: workspace.description,
          },
          predicates,
          transactions,
        },
        Responses.Ok,
      );
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
      const response = await User.find({
        where: { name: nickname },
      })
        .then(response => !!response[0])
        .catch(e => {
          return true;
        });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  //todo: CREATE FLOW
  /**
   * - request a code to endpoint /auth/webauthn/code -> no required middleware
   *    - add this code on database, with validAt equal now + 5 minutes
   *    - return this code on request
   *
   *
   * - request a create user to endpoint /auth/webauthn
   *    - code(challange)
   *    - webauthn -> {
   *                        id,
   *                        privateKey
   *                   }
   *    - address -> hexadecimal da fuel -> 0x..., convert using Address.fromB256(address)
   *    - name -> unique
   */

  //todo: AUTH FLOW
  /**
   *    - change auth typings to use webauthn
   *        -
   *
   *
   *
   *
   *
   *    - request a endpoint /auth/webauthn
   *          -
   *
   *
   *
   *
   *
   *
   */

  //verify used name
  async create(req: ICreateRequest) {
    try {
      const { address, name } = req.body;

      //verify user exists
      const existingUser = await this.userService.findByAddress(address);
      if (existingUser) return successful(existingUser, Responses.Created);

      //verify name exists
      const existingName = await User.findOne({ name });
      if (existingName) {
        throw new Internal({
          type: ErrorTypes.Create,
          title: 'Error on user create',
          detail: `User with name ${name} already exists`,
        });
      }

      //create
      const response = await this.userService.create({
        ...req.body,
        address: Address.fromB256(address).toString(),
        avatar: await this.userService.randomAvatar(),
      });

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

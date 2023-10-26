import { Predicate } from '@src/models/Predicate';
import Role from '@src/models/Role';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IUserService } from '../configs/user/types';
import {
  ICreatePredicateRequest,
  IDeletePredicateRequest,
  IFindByHashRequest,
  IFindByIdRequest,
  IListRequest,
  IPredicateService,
} from './types';

export class PredicateController {
  private predicateService: IPredicateService;
  private userService: IUserService;

  constructor(predicateService: IPredicateService, userService: IUserService) {
    this.predicateService = predicateService;
    this.userService = userService;
    bindMethods(this);
  }

  async create({ body: payload, user }: ICreatePredicateRequest) {
    try {
      const roles = await Role.find({ where: [{ name: 'Administrador' }] });

      const addMembers = payload.addresses.map(async address => {
        let user = await this.userService.findByAddress(address);

        if (!user) {
          user = await this.userService.create({
            address,
            provider: payload.provider,
            role: roles[0],
            avatar: await this.userService.randomAvatar(),
          });
        }

        return user;
      });

      const members = await Promise.all(addMembers);

      const newPredicate = await this.predicateService.create({
        ...payload,
        owner: user.id,
        members,
      });

      return successful(newPredicate, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async delete({ params: { id } }: IDeletePredicateRequest) {
    try {
      const response = await this.predicateService.delete(id);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findById({ params: { id }, user }: IFindByIdRequest) {
    try {
      const response = await this.predicateService.findById(id, user.address);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async findByAddress({ params: { address } }: IFindByHashRequest) {
    try {
      const response = await this.predicateService
        .filter({ address })
        .list()
        .then((data: Predicate[]) => data[0]);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list(req: IListRequest) {
    const {
      provider,
      address: predicateAddress,
      owner,
      orderBy,
      sort,
      page,
      perPage,
      q,
    } = req.query;
    const { address } = req.user;

    try {
      const response = await this.predicateService
        .filter({ address: predicateAddress, signer: address, provider, owner, q })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

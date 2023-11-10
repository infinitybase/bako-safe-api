import AddressBook from '@src/models/AddressBook';
import { Predicate } from '@src/models/Predicate';
import Role from '@src/models/Role';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IAddressBookService } from '../addressBook/types';
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
  private addressBookService: IAddressBookService;

  constructor(
    predicateService: IPredicateService,
    userService: IUserService,
    addressBookService: IAddressBookService,
  ) {
    this.predicateService = predicateService;
    this.userService = userService;
    this.addressBookService = addressBookService;
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
        owner_id: user.id,
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
      const predicate = await this.predicateService.findById(id, user.address);
      const membersIds = predicate.members.map(member => member.id);
      const favorites = (await this.addressBookService
        .filter({ createdBy: user.id, userIds: membersIds })
        .list()) as AddressBook[];

      const response = {
        ...predicate,
        members: predicate.members.map(member => ({
          ...member,
          nickname:
            favorites?.find(({ user }) => user.id === member.id)?.nickname ??
            undefined,
        })),
      };

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

import Role from '@src/models/Role';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IUserService } from '../configs/user/types';
import {
  IAddressBookService,
  ICreateAddressBookRequest,
  IDeleteAddressBookRequest,
  IListAddressBookRequest,
  IUpdateAddressBookRequest,
} from './types';

export class AddressBookController {
  private addressBookService: IAddressBookService;
  private userService: IUserService;

  constructor(addressBookService: IAddressBookService, userService: IUserService) {
    Object.assign(this, { addressBookService, userService });
    bindMethods(this);
  }

  async create({ body, user: { provider } }: ICreateAddressBookRequest) {
    try {
      const { address } = body;
      const roles = await Role.find({ where: [{ name: 'Administrador' }] });

      let user = await this.userService.findByAddress(address);

      if (!user) {
        user = await this.userService.create({
          address,
          provider,
          role: roles[0],
          avatar: await this.userService.randomAvatar(),
          active: true,
        });
      }

      const newContact = await this.addressBookService.create({
        ...body,
        createdBy: user,
      });
      return successful(newContact, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async update({ body, params }: IUpdateAddressBookRequest) {
    try {
      const updatedContact = await this.addressBookService.update(params.id, body);
      return successful(updatedContact, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async delete({ params }: IDeleteAddressBookRequest) {
    try {
      const deletedContact = await this.addressBookService.delete(params.id);
      return successful(deletedContact, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list({ query, user }: IListAddressBookRequest) {
    const { id } = user;
    const { orderBy, sort, page, perPage, q } = query;

    try {
      const response = await this.addressBookService
        .filter({ createdBy: id, q })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

import AddressBook from '@src/models/AddressBook';
import Role from '@src/models/Role';
import Internal from '@src/utils/error/Internal';

import { ErrorTypes, error } from '@utils/error';
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

  async create({ body, user }: ICreateAddressBookRequest) {
    try {
      const { address, nickname } = body;

      const duplicatedNickname = await this.addressBookService
        .filter({
          createdBy: user.id,
          nickname,
        })
        .list();

      const duplicatedAddress = await this.addressBookService
        .filter({
          createdBy: user.id,
          contactAddress: address,
        })
        .list();

      const hasDuplicate =
        (duplicatedNickname as AddressBook[]).length ||
        (duplicatedAddress as AddressBook[]).length;

      if (hasDuplicate) {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on contact creation',
          detail: `Duplicated ${
            (duplicatedNickname as AddressBook[]).length ? 'label' : 'address'
          }`,
        });
      }

      let savedUser = await this.userService.findByAddress(address);

      if (!savedUser) {
        const roles = await Role.find({ where: [{ name: 'Administrador' }] });
        savedUser = await this.userService.create({
          address,
          provider: user.provider,
          role: roles[0],
          avatar: await this.userService.randomAvatar(),
          active: true,
        });
      }

      const newContact = await this.addressBookService.create({
        ...body,
        user_id: savedUser.id,
        createdBy: user,
      });

      return successful(newContact, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async update({ body, params, user }: IUpdateAddressBookRequest) {
    try {
      const duplicatedNickname = await this.addressBookService
        .filter({
          createdBy: user.id,
          nickname: body.nickname,
        })
        .list();

      const duplicatedAddress = await this.addressBookService
        .filter({
          createdBy: user.id,
          contactAddress: body.address,
        })
        .list();

      const hasDuplicate =
        ((duplicatedNickname as AddressBook[]).length &&
          duplicatedNickname[0].id !== params.id) ||
        ((duplicatedAddress as AddressBook[]).length &&
          duplicatedAddress[0].id !== params.id);

      if (hasDuplicate) {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on contact update',
          detail: `Unavailable address or nickname`,
        });
      }

      let savedUser = await this.userService.findByAddress(body.address);

      if (!savedUser) {
        const roles = await Role.find({ where: [{ name: 'Administrador' }] });
        savedUser = await this.userService.create({
          address: body.address,
          provider: user.provider,
          role: roles[0],
          avatar: await this.userService.randomAvatar(),
          active: true,
        });
      }

      const { address, ...rest } = body;

      const updatedContact = await this.addressBookService.update(params.id, {
        ...rest,
        user_id: savedUser.id,
      });
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

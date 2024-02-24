import AddressBook from '@src/models/AddressBook';
import Role from '@src/models/Role';
import { Workspace } from '@src/models/Workspace';
import Internal from '@src/utils/error/Internal';

import { ErrorTypes, error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IUserService } from '../user/types';
import { WorkspaceService } from '../workspace/services';
import { AddressBookService } from './services';
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

  async create(req: ICreateAddressBookRequest) {
    try {
      const { address, nickname } = req.body;
      const { workspace, user } = req;

      const duplicatedNickname = await new AddressBookService()
        .filter({
          owner: [workspace.id],
          nickname,
        })
        .list()
        .then((response: AddressBook[]) => response.length > 0);

      const duplicatedAddress = await new AddressBookService()
        .filter({
          owner: [workspace.id],
          contactAddress: address,
        })
        .paginate(undefined)
        .list()
        .then((response: AddressBook[]) => response.length > 0);

      const hasDuplicate = duplicatedNickname || duplicatedAddress;

      if (hasDuplicate) {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on contact creation',
          detail: `Duplicated ${duplicatedNickname ? 'nickname' : 'address'}`,
        });
      }

      let savedUser = await this.userService.findByAddress(address);

      if (!savedUser) {
        savedUser = await this.userService.create({
          address,
          provider: user.provider,
          avatar: await this.userService.randomAvatar(),
          active: true,
        });
      }

      const newContact = await this.addressBookService.create({
        ...req.body,
        user: savedUser,
        owner: workspace,
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
          owner: [user.id],
          nickname: body.nickname,
        })
        .list();

      const duplicatedAddress = await this.addressBookService
        .filter({
          owner: [user.id],
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
        savedUser = await this.userService.create({
          address: body.address,
          provider: user.provider,
          avatar: await this.userService.randomAvatar(),
          active: true,
        });
      }

      const { address, ...rest } = body;

      const updatedContact = await this.addressBookService.update(params.id, {
        ...rest,
        user: savedUser,
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

  async list(req: IListAddressBookRequest) {
    const { workspace, user } = req;
    const { orderBy, sort, page, perPage, q, includePersonal } = req.query;

    try {
      const owner = [workspace.id];
      const singleWk = await new WorkspaceService()
        .filter({
          user: user.id,
          single: true,
        })
        .list()
        .then((response: Workspace[]) => response[0].id);

      if (includePersonal === 'true') {
        owner.push(singleWk);
      }

      const response = await this.addressBookService
        .filter({ owner, q })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list()
        .then((res: AddressBook[]) => {
          return res.reduce((acc, currentItem) => {
            const existingItem = acc.find(
              item => item.user.id === currentItem.user.id,
            );

            if (!existingItem) {
              acc.push(currentItem);
              return acc;
            }
            // Se já existe, retornar de preferencia o que tem o wk igual ao single
            if (
              currentItem.owner.id === (includePersonal ? singleWk : workspace.id)
            ) {
              const existingIndex = acc.findIndex(
                item => item.user.id === currentItem.user.id,
              );
              acc[existingIndex] = currentItem;
            }

            return acc;
          }, []);
        });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

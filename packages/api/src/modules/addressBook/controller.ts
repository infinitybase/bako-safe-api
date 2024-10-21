import AddressBook from '@src/models/AddressBook';
import { Workspace } from '@src/models/Workspace';
import Internal from '@src/utils/error/Internal';
import { IPagination } from '@src/utils/pagination';

import { ErrorTypes, error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { TypeUser } from '@src/models';
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
import { IconUtils } from '@utils/icons';
import { Address } from 'fuels';

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
      const { workspace, network } = req;
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
          provider: network.url,
          avatar: IconUtils.user(),
          type: TypeUser.FUEL,
          name: Address.fromRandom().toB256(),
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

  async update({ body, params, network, workspace }: IUpdateAddressBookRequest) {
    let hasDuplicateNickname = false;
    let hasDuplicateAddress = false;

    try {
      const originalContact = await this.addressBookService.findById(params.id);

      const isNicknameChanged =
        body.nickname && body.nickname !== originalContact.nickname;

      const isAddressChanged =
        body.address && body.address !== originalContact.user.address;

      if (isNicknameChanged) {
        const duplicatedNickname = await this.addressBookService
          .filter({
            owner: [workspace.id],
            nickname: body.nickname,
          })
          .list();

        const duplicatedNicknameFormat = Array.isArray(duplicatedNickname)
          ? duplicatedNickname
          : [duplicatedNickname];

        hasDuplicateNickname =
          duplicatedNicknameFormat.length && duplicatedNickname[0].id !== params.id;
      }

      if (isAddressChanged) {
        const duplicatedAddress = await this.addressBookService
          .filter({
            owner: [workspace.id],
            contactAddress: body.address,
          })
          .list();

        const duplicatedAddressFormat = Array.isArray(duplicatedAddress)
          ? duplicatedAddress
          : [duplicatedAddress];

        hasDuplicateAddress =
          duplicatedAddressFormat.length && duplicatedAddress[0].id !== params.id;
      }

      if (hasDuplicateNickname || hasDuplicateAddress) {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on contact update',
          detail: `Duplicated ${hasDuplicateNickname ? 'nickname' : 'address'}`,
        });
      }

      let savedUser = await this.userService.findByAddress(body.address);

      if (!savedUser) {
        savedUser = await this.userService.create({
          address: body.address,
          provider: network.url,
          avatar: IconUtils.user(),
          type: TypeUser.FUEL,
          name: Address.fromRandom().toB256(),
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
      const hasIncludePersonal = includePersonal === 'true';
      if (hasIncludePersonal) {
        owner.push(singleWk);
      }

      const response = await this.addressBookService
        .filter({ owner, q })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list()
        .then((response: AddressBook[] | IPagination<AddressBook>) => {
          if (response instanceof Array) {
            return AddressBookService.formattDuplicatedAddress(
              response,
              singleWk,
              hasIncludePersonal,
              workspace.id,
            );
          }

          return {
            ...response,
            data: AddressBookService.formattDuplicatedAddress(
              response.data,
              singleWk,
              hasIncludePersonal,
              workspace.id,
            ),
          };
        });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

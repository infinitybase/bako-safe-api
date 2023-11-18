import AddressBook from '@src/models/AddressBook';
import { Predicate } from '@src/models/Predicate';
import Role from '@src/models/Role';

import { Asset, Transaction, TransactionStatus } from '@models/index';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IAddressBookService } from '../addressBook/types';
import { IUserService } from '../configs/user/types';
import { ITransactionService } from '../transaction/types';
import {
  ICreatePredicateRequest,
  IDeletePredicateRequest,
  IFindByHashRequest,
  IFindByIdRequest,
  IListRequest,
  IPredicateService,
} from './types';

export class PredicateController {
  private userService: IUserService;
  private predicateService: IPredicateService;
  private addressBookService: IAddressBookService;
  private transactionService: ITransactionService;

  constructor(
    userService: IUserService,
    predicateService: IPredicateService,
    addressBookService: IAddressBookService,
    transactionService: ITransactionService,
  ) {
    this.userService = userService;
    this.predicateService = predicateService;
    this.addressBookService = addressBookService;
    this.transactionService = transactionService;
    bindMethods(this);
  }

  async create({ body: payload, user }: ICreatePredicateRequest) {
    try {
      console.log('[create]');
      //const roles = await Role.find({ where: [{ name: 'Administrador' }] });

      const addMembers = payload.addresses.map(async address => {
        let user = await this.userService.findByAddress(address);

        if (!user) {
          user = await this.userService.create({
            address,
            provider: payload.provider,
            //role: roles[0],
            avatar: await this.userService.randomAvatar(),
          });
        }

        return user;
      });

      const members = await Promise.all(addMembers);

      const newPredicate = await this.predicateService.create({
        ...payload,
        owner: user,
        members,
      });

      return successful(newPredicate, Responses.Ok);
    } catch (e) {
      console.log('[ERRO]', e);
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
        .filter({
          address,
        })
        .paginate({
          page: '',
          perPage: '',
        })
        .list()
        .then((data: Predicate[]) => data);
      return successful(response[0], Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async hasReservedCoins({ params: { address } }: IFindByHashRequest) {
    try {
      const response = await this.transactionService
        .filter({
          predicateAddress: address,
        })
        .list()
        .then((data: Transaction[]) => {
          const a: string[] = [];
          data
            .filter(
              (transaction: Transaction) =>
                transaction.status == TransactionStatus.AWAIT_REQUIREMENTS ||
                transaction.status == TransactionStatus.PENDING_SENDER,
            )
            .map((_filteredTransactions: Transaction) => {
              _filteredTransactions.assets.map((_assets: Asset) =>
                a.push(_assets.utxo),
              );
            });
          return a;
        })
        .catch(() => {
          return [];
        });

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

import { TransactionStatus } from 'bsafe';
import { bn } from 'fuels';

import AddressBook from '@src/models/AddressBook';
import { Predicate } from '@src/models/Predicate';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';

import { Asset, NotificationTitle, Transaction, User } from '@models/index';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IAddressBookService } from '../addressBook/types';
import { IUserService } from '../configs/user/types';
import { INotificationService } from '../notification/types';
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
  private notificationService: INotificationService;

  constructor(
    userService: IUserService,
    predicateService: IPredicateService,
    addressBookService: IAddressBookService,
    transactionService: ITransactionService,
    notificationService: INotificationService,
  ) {
    this.userService = userService;
    this.predicateService = predicateService;
    this.addressBookService = addressBookService;
    this.transactionService = transactionService;
    this.notificationService = notificationService;
    bindMethods(this);
  }

  async create({ body: payload, user }: ICreatePredicateRequest) {
    try {
      const members: User[] = [];
      for await (const member of payload.addresses) {
        let user = await this.userService.findByAddress(member);

        if (!user) {
          user = await this.userService.create({
            address: member,
            provider: payload.provider,
            avatar: await this.userService.randomAvatar(),
          });
        }

        members.push(user);
      }

      const newPredicate = await this.predicateService.create({
        ...payload,
        owner: user,
        members,
      });

      const { id, name, members: predicateMembers } = newPredicate;
      const summary = { vaultId: id, vaultName: name };
      const membersWithoutLoggedUser = predicateMembers.filter(
        member => member.id !== user.id,
      );

      for await (const member of membersWithoutLoggedUser) {
        await this.notificationService.create({
          title: NotificationTitle.NEW_VAULT_CREATED,
          user_id: member.id,
          summary,
        });

        if (member.notify) {
          await sendMail(EmailTemplateType.VAULT_CREATED, {
            to: member.email,
            data: { summary: { ...summary, name: member?.name ?? '' } },
          });
        }
      }

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
        .filter({
          address,
        })
        .paginate(undefined)
        .list()
        .then((data: Predicate[]) => data[0]);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async hasReservedCoins({ params: { address } }: IFindByHashRequest) {
    try {
      //console.log('[HAS_RESERVED_COINS]: ', address);
      const response = await this.transactionService
        .filter({
          predicateId: [address],
        })
        .list()
        .then((data: Transaction[]) => {
          // const a: BN = bn.parseUnits('0');
          // //console.log(data.map((transaction: Transaction) => transaction.assets));
          // data
          //   .filter(
          //     (transaction: Transaction) =>
          //       transaction.status == TransactionStatus.AWAIT_REQUIREMENTS ||
          //       transaction.status == TransactionStatus.PENDING_SENDER,
          //   )
          //   .map((_filteredTransactions: Transaction) => {
          //     _filteredTransactions.assets.map((_assets: Asset) => {
          //       console.log(_assets.amount, a.add(bn.parseUnits(_assets.amount)));
          //       return a.add(bn.parseUnits(_assets.amount));
          //     });
          //   });
          return data
            .filter(
              (transaction: Transaction) =>
                transaction.status === TransactionStatus.AWAIT_REQUIREMENTS ||
                transaction.status === TransactionStatus.PENDING_SENDER,
            )
            .reduce((accumulator, transaction: Transaction) => {
              return accumulator.add(
                transaction.assets.reduce((assetAccumulator, asset: Asset) => {
                  console.log(
                    asset.amount,
                    assetAccumulator.add(bn.parseUnits(asset.amount)),
                  );
                  return assetAccumulator.add(bn.parseUnits(asset.amount));
                }, bn.parseUnits('0')),
              );
            }, bn.parseUnits('0'));
        })
        .catch(e => {
          return bn.parseUnits('0');
        });

      //console.log('[HAS_RESERVED_COINS]: ', response.format().toString());

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

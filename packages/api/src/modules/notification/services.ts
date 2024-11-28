import { Notification, NotificationTitle } from '@src/models';
import { SocketClient } from '@src/socket/client';
import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { IOrdination, setOrdination } from '@utils/ordination';
import { IPagination, Pagination, PaginationParams } from '@utils/pagination';

import {
  ICreateNotificationPayload,
  IFilterNotificationParams,
  INotificationService,
  IUpdateNotificationPayload,
} from './types';
import { DeepPartial } from 'typeorm';
import { TransactionService } from '../transaction/services';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';
import { Network } from 'fuels';
import { SocketEvents, SocketUsernames } from '@src/socket/types';
import { PredicateService } from '../predicate/services';

const { API_URL } = process.env;

export class NotificationService implements INotificationService {
  private _pagination: PaginationParams;
  private _filter: IFilterNotificationParams;
  private _ordination: IOrdination<Notification> = {
    orderBy: 'updatedAt',
    sort: 'DESC',
  };

  filter(filter: IFilterNotificationParams) {
    this._filter = filter;
    return this;
  }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Notification>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

  async create(payload: ICreateNotificationPayload): Promise<Notification> {
    const partialPayload: DeepPartial<Notification> = payload;
    const notification = await Notification.create(partialPayload)
      .save()
      .then(() => this.findLast())
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on notification creation',
          detail: e,
        });
      });

    const socketClient = new SocketClient(notification.user_id, API_URL);
    socketClient.socket.emit(SocketEvents.NOTIFICATION, {
      sessionId: notification.user_id,
      to: SocketUsernames.UI,
      request_id: undefined,
      type: SocketEvents.NEW_NOTIFICATION,
      data: {}
    });

    return notification
  }

  async list(): Promise<IPagination<Notification> | Notification[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Notification.createQueryBuilder('notification').select();

    this._filter.userId &&
      queryBuilder.andWhere('notification.user_id = :userId', {
        userId: `${this._filter.userId}`,
      });

    this._filter.networkUrl &&
      queryBuilder.andWhere(
        `regexp_replace(notification.network->>'url', '^https?://[^@]+@', 'https://') = :network`,
        {
          network: this._filter.networkUrl.replace(
            /^https?:\/\/[^@]+@/,
            'https://',
          ),
        },
      );

    this._filter.unread &&
      queryBuilder.andWhere('notification.read = :read', {
        read: false,
      });

    queryBuilder.orderBy(
      `notification.${this._ordination.orderBy}`,
      this._ordination.sort,
    );

    return hasPagination
      ? Pagination.create(queryBuilder)
        .paginate(this._pagination)
        .then(result => result)
        .catch(e => Internal.handler(e, 'Error on notification list'))
      : queryBuilder
        .getMany()
        .then(notifications => notifications)
        .catch(e => Internal.handler(e, 'Error on notification list'));
  }

  async update(
    userId: string,
    networkUrl: string,
    payload: IUpdateNotificationPayload,
  ): Promise<boolean> {
    return Notification.createQueryBuilder()
      .update(payload)
      .where('user_id = :userId', { userId })
      .andWhere(
        `regexp_replace(network->>'url', '^https?://[^@]+@', 'https://') = :network`,
        { network: networkUrl.replace(/^https?:\/\/[^@]+@/, 'https://') },
      )
      .execute()
      .then(() => true)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on notification update',
          detail: e,
        });
      });
  }

  async findLast(): Promise<Notification> {
    return await Notification.createQueryBuilder('notification')
      .select()
      .orderBy('notification.createdAt', 'DESC')
      .getOne()
      .then(data => data)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on notification find last',
          detail: e,
        });
      });
  }


  async vaultUpdate(vaultId: string) {
    const vault = await new PredicateService().findById(vaultId);

    if (!vault) {
      return;
    }

    const members = vault.members;

    for await (const member of members) {
      const socketClient = new SocketClient(member.id, API_URL);
      socketClient.socket.emit(SocketEvents.NOTIFICATION, {
        sessionId: member.id,
        to: SocketUsernames.UI,
        request_id: undefined,
        type: SocketEvents.VAULT_UPDATE,
        data: {}
      });
    }
  }

  async transactionUpdate(txId: string) {
    const tx = await new TransactionService().findById(txId);

    if (!tx) {
      return;
    }

    const members = tx.predicate.members;

    for await (const member of members) {
      const socketClient = new SocketClient(member.id, API_URL);
      socketClient.socket.emit(SocketEvents.NOTIFICATION, {
        sessionId: member.id,
        to: SocketUsernames.UI,
        request_id: undefined,
        type: SocketEvents.TRANSACTION_UPDATE,
        data: {}
      });
    }
  }

  // select all members of predicate
  // create a notification for each member
  async transactionSuccess(txId: string, network: Network) {
    const tx = await new TransactionService().findById(txId);

    if (!tx) {
      return;
    }

    const members = await tx.predicate.members;
    const summary = {
      vaultId: tx.predicate.id,
      vaultName: tx.predicate.name,
      transactionId: tx.id,
      transactionName: tx.name,
      workspaceId: tx.predicate.workspace.id,
    };

    for await (const member of members) {
      await this.create({
        title: NotificationTitle.TRANSACTION_COMPLETED,
        summary,
        user_id: member.id,
        network,
      });

      if (member.notify) {
        await sendMail(EmailTemplateType.TRANSACTION_COMPLETED, {
          to: member.email,
          data: { summary: { ...summary, name: member?.name ?? '' } },
        });
      }

      const socketClient = new SocketClient(member.id, API_URL);
      socketClient.socket.emit(SocketEvents.NOTIFICATION, {
        sessionId: member.id,
        to: SocketUsernames.UI,
        request_id: undefined,
        type: SocketEvents.TRANSACTION_UPDATE,
        data: {}
      });
    }
  }
}

import { userInfo } from 'os';

import { Notification, NotificationTitle } from '@src/models';

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
import { VaultTemplate } from '@src/models/VaultTemplate';
import { TransactionService } from '../transaction/services';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';

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
    return await Notification.create(partialPayload)
      .save()
      .then(() => this.findLast())
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on notification creation',
          detail: e,
        });
      });
  }

  async list(): Promise<IPagination<Notification> | Notification[]> {
    const hasPagination = this._pagination?.page && this._pagination?.perPage;
    const queryBuilder = Notification.createQueryBuilder('notification').select();

    this._filter.userId &&
      queryBuilder.andWhere('notification.user_id = :userId', {
        userId: `${this._filter.userId}`,
      });

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
    payload: IUpdateNotificationPayload,
  ): Promise<boolean> {
    return Notification.update({ user_id: userId }, payload)
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

  // select all members of predicate
  // create a notification for each member
  async transactionSuccess(txId: string) {
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

    // members.forEach(async member => {
    //   const payload = {
    //     userId: member.id,
    //     type: 'TRANSACTION_SUCCESS',
    //     summary,
    //   };

    for await (const member of members) {
      await this.create({
        title: NotificationTitle.TRANSACTION_COMPLETED,
        summary,
        user_id: member.id,
      });

      if (member.notify) {
        await sendMail(EmailTemplateType.TRANSACTION_COMPLETED, {
          to: member.email,
          data: { summary: { ...summary, name: member?.name ?? '' } },
        });
      }
    }
    // })
  }
}

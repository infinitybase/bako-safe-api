import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import {
  IListNotificationsRequest,
  INotificationService,
  IReadAllNotificationsRequest,
} from './types';

export class NotificationController {
  private notificationService: INotificationService;

  constructor(notificationService: INotificationService) {
    Object.assign(this, { notificationService });
    bindMethods(this);
  }

  async readAll({ user, network }: IReadAllNotificationsRequest) {
    try {
      const markAsRead = await this.notificationService.update(
        user.id,
        network.url,
        { read: true },
      );
      return successful(markAsRead, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list({ query, user, network }: IListNotificationsRequest) {
    const { id } = user;
    const { orderBy, sort, page, perPage, unread } = query;

    try {
      const response = await this.notificationService
        .filter({
          userId: id,
          networkUrl: network.url,
          ...(unread ? { unread: true } : {}),
        })
        .ordination({ orderBy, sort })
        .paginate({ page, perPage })
        .list();

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

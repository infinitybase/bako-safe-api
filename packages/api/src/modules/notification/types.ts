import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import {
  Notification,
  NotificationSummary,
  NotificationTitle,
} from '@src/models/index';

import { IDefaultOrdination, IOrdination } from '@utils/ordination';
import { IPagination, PaginationParams } from '@utils/pagination';
import { Network } from 'fuels';

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export interface ICreateNotificationPayload {
  user_id?: string;
  title: NotificationTitle;
  read?: boolean;
  summary: NotificationSummary;
  network: Network;
}

export type IUpdateNotificationPayload = Partial<ICreateNotificationPayload>;

export interface IFilterNotificationParams {
  userId?: string;
  unread?: boolean;
  networkUrl?: string;
}

interface IListNotificationsRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    orderBy: IDefaultOrdination;
    sort: Sort;
    page: string;
    perPage: string;
  };
}

type IReadAllNotificationsRequestSchema = ValidatedRequestSchema;

export type IListNotificationsRequest = AuthValidatedRequest<IListNotificationsRequestSchema>;
export type IReadAllNotificationsRequest = AuthValidatedRequest<IReadAllNotificationsRequestSchema>;

export interface INotificationService {
  ordination(ordination?: IOrdination<Notification>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IFilterNotificationParams): this;

  list: () => Promise<IPagination<Notification> | Notification[]>;
  create: (payload: ICreateNotificationPayload) => Promise<Notification>;
  update: (
    userId: string,
    networkUrl: string,
    payload: IUpdateNotificationPayload,
  ) => Promise<boolean>;
}

import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import {
  Notification,
  NotificationSummary,
  NotificationTitle,
} from '@src/models/index';

import { IOrdination } from '@utils/ordination';
import { IPagination, PaginationParams } from '@utils/pagination';

export enum OrderBy {
  creation = 'createdAt',
  update = 'updatedAt',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export interface ICreateNotificationPayload {
  user_id?: string;
  title: NotificationTitle;
  read?: boolean;
  summary: NotificationSummary;
}

export type IUpdateNotificationPayload = Partial<ICreateNotificationPayload>;

export interface IFilterNotificationParams {
  userId?: string;
  unread?: boolean;
}

interface IListNotificationsRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    orderBy: OrderBy;
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
    selector: unknown,
    payload: IUpdateNotificationPayload,
  ) => Promise<boolean>;
}

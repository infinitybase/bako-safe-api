import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { ValidatedRequestSchema } from 'express-joi-validation';

export enum TaskId {
  'REGULAR_ACCOUNT' = 'REGULAR_ACCOUNT',
  'WEBAUTHN_ACCOUNT' = 'WEBAUTHN_ACCOUNT',
  'COMPLETED_TX' = 'COMPLETED_TX',
  'COMPLETED_TX_MULTISIG' = 'COMPLETED_TX_MULTISIG',
}

export type CompletedTask = {
  userId: string;
  taskId: TaskId;
  date: Date; // TODO: Confirm if its really needed
};

export type UserScore = {
  score: number;
  completedTasks?: CompletedTask[];
};

export type CompleteTaskParams = {
  userId: string;
  taskId: TaskId;
};

export type ScoreRequest = AuthValidatedRequest<ValidatedRequestSchema>;

export interface IPointsService {
  completeTask(params: CompleteTaskParams): Promise<CompletedTask>;
  findUserTasks(userId: string): Promise<CompletedTask[]>;
  getScore(userId: string, includeTasks?: boolean): Promise<UserScore>;
}

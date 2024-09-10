export enum TaskId {
  'REGULAR_ACCOUNT' = 'REGULAR_ACCOUNT',
  'WEBAUTHN_ACCOUNT' = 'WEBAUTHN_ACCOUNT',
  'COMPLETED_TX' = 'COMPLETED_TX',
  'COMPLETED_TX_MULTISIG' = 'COMPLETED_TX_MULTISIG',
}

export const taskInfo = {
  [TaskId.REGULAR_ACCOUNT]: {
    name: 'Regular account',
    description: 'Task description',
  },
  [TaskId.WEBAUTHN_ACCOUNT]: {
    name: 'Webauthn account',
    description: 'Task description',
  },
  [TaskId.COMPLETED_TX]: {
    name: 'Completed transaction',
    description: 'Task description',
  },
  [TaskId.COMPLETED_TX_MULTISIG]: {
    name: 'Completed multisig transaction',
    description: 'Task description',
  },
};

export const taskList = [
  {
    id: TaskId.REGULAR_ACCOUNT,
    name: taskInfo[TaskId.REGULAR_ACCOUNT].name,
    description: taskInfo[TaskId.REGULAR_ACCOUNT].description,
    points: 10,
  },
  {
    id: TaskId.WEBAUTHN_ACCOUNT,
    name: taskInfo[TaskId.WEBAUTHN_ACCOUNT].name,
    description: taskInfo[TaskId.WEBAUTHN_ACCOUNT].description,
    points: 100,
  },
  {
    id: TaskId.COMPLETED_TX,
    name: taskInfo[TaskId.COMPLETED_TX].name,
    description: taskInfo[TaskId.COMPLETED_TX].description,
    points: 10,
  },
  {
    id: TaskId.COMPLETED_TX_MULTISIG,
    name: taskInfo[TaskId.COMPLETED_TX_MULTISIG].name,
    description: taskInfo[TaskId.COMPLETED_TX_MULTISIG].description,
    points: 10,
  },
];

export type CompletedTask = {
  userId: string;
  taskId: TaskId;
  date: Date; // TODO: Confirm if its really needed
};

export type CompleteTaskParams = {
  userId: string;
  taskId: TaskId;
};

export interface IPointService {
  completeTask(params: CompleteTaskParams): Promise<CompletedTask>;
  findUserTasks(userId: string): Promise<CompletedTask[]>;
  getUserScore(userId: string): Promise<number>;
}

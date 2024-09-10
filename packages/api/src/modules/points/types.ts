export enum TaskName {
  'REGULAR_ACCOUNT' = 'REGULAR_ACCOUNT',
  'WEBAUTHN_ACCOUNT' = 'WEBAUTHN_ACCOUNT',
  'COMPLETED_TX' = 'COMPLETED_TX',
  'COMPLETED_TX_MULTISIG' = 'COMPLETED_TX_MULTISIG',
}

export const taskUiName = {
  [TaskName.REGULAR_ACCOUNT]: 'Conta normal',
  [TaskName.WEBAUTHN_ACCOUNT]: 'Conta webauthn',
  [TaskName.COMPLETED_TX]: 'Transação completa',
  [TaskName.COMPLETED_TX_MULTISIG]: 'Transação completa em multisig',
};

export const taskList = [
  {
    id: TaskName.REGULAR_ACCOUNT,
    name: taskUiName[TaskName.REGULAR_ACCOUNT],
    description: 'Task description',
    points: 10,
  },
  {
    id: TaskName.WEBAUTHN_ACCOUNT,
    name: taskUiName[TaskName.WEBAUTHN_ACCOUNT],
    description: 'Task description',
    points: 100,
  },
  {
    id: TaskName.COMPLETED_TX,
    name: taskUiName[TaskName.COMPLETED_TX],
    description: 'Task description',
    points: 10,
  },
  {
    id: TaskName.COMPLETED_TX_MULTISIG,
    name: taskUiName[TaskName.COMPLETED_TX_MULTISIG],
    description: 'Task description',
    points: 10,
  },
];

export type CompletedTask = {
  userId: string;
  task: TaskName;
  date: Date; // TODO: Confirm if its really needed
};

export type CreatePointsParams = {
  userId: string;
  task: TaskName;
};

export interface IPointService {
  create(params: CreatePointsParams): Promise<CompletedTask>;
  // filter(filter: IFilterParams): this;
  // ordination(ordination: IOrdination<User>): this;
  // find(): Promise<IPagination<User> | User[]>;
}

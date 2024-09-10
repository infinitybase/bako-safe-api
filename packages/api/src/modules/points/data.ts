import { TaskId } from './types';

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

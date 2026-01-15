export interface IMessage {
  sessionId: string; // sessionId
  to: string; // username -> recebe a mensagem '[UI]' por exemplo
  type: string; // tipo da mensagem/evento
  data: { [key: string]: any };
  request_id?: string;
}

export interface IConnectedSocketUser {
  id: string;
  sessionId: string;
  username: string;
  time: number;
  request_id?: string;
}

export enum SocketEvents {
  CONNECT = 'connection',
  DEFAULT = 'message',
  NOTIFICATION = 'notification',

  NEW_NOTIFICATION = '[NEW_NOTIFICATION]',
  TRANSACTION_UPDATE = '[TRANSACTION]',
  VAULT_UPDATE = '[VAULT]',

  TRANSACTION_CREATED = '[CREATED]',
  TRANSACTION_UPDATED = '[UPDATED]',
  TRANSACTION_CANCELED = '[CANCELED]',

  SWITCH_NETWORK = '[SWITCH_NETWORK]',
  BALANCE_OUTDATED_USER = '[BALANCE_OUTDATED_USER]',
  BALANCE_OUTDATED_PREDICATE = '[BALANCE_OUTDATED_PREDICATE]',
}

export enum SocketUsernames {
  UI = '[UI]',
  CONNECTOR = '[CONNECTOR]',
  API = '[API]',
}

export enum AuthNotifyType {
  // update:
  // add or update a session (timeout or wk)
  // remove:
  // remove a session (logout)
  UPDATE = '[UPDATE]',
  REMOVE = '[REMOVE]',
}

// force commit

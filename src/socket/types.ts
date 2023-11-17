export enum SocketEvents {
  //auth
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  USER_CONNECTED = '[USER_CONNECTED]',

  //popup transfer
  TRANSACTION_CREATED = '[TRANSACTION_CREATED]',
  TRANSACTION_SEND = '[TRANSACTION_SEND]',

  //popup auth
  AUTH_CONFIRMED = '[AUTH_CONFIRMED]',
  AUTH_REJECTED = '[AUTH_REJECTED]',

  //default
  DEFAULT = 'message',

  //accounts
  ACCOUNTS = 'accounts',
  CURRENT_ACCOUNT = 'currentAccount',
}

export enum UserTypes {
  WALLET = '[WALLET]',
  POPUP_AUTH = '[POPUP_AUTH]',
  POPUP_TRANSFER = '[POPUP_TRANSFER]',
}

export interface ISocketUser {
  type: UserTypes;
  userID: string;
  username: string;
}

export interface BaseSocketEvent {
  sessionId: string;
  address: string;
  vaultId: string;
  origin: string;
  name?: string;
  hash?: string;
}

export interface ISocketEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: BaseSocketEvent;
  to: string;
}
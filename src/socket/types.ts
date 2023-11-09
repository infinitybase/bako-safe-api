export enum SocketEvents {
  //auth
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  USER_CONNECTED = '[USER_CONNECTED]',

  //popup transfer
  TRANSACTION_REQUESTED = '[TRANSACTION_REQUESTED]',
  TRANSACTION_APPROVED = '[TRANSACTION_APPROVED]',

  //popup auth
  AUTH_CONFIRMED = '[AUTH_CONFIRMED]',
  AUTH_REJECTED = '[AUTH_REJECTED]',
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
  origin: string;
}

export interface IAuthSocketEvent extends BaseSocketEvent {
  vaultId: string;
}

export interface ISocketEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: IAuthSocketEvent;
  to: string;
}

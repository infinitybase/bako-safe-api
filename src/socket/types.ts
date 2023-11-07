export interface ISocketUser {
  userID: string;
  username: string;
}

export enum IAuthEventType {
  VAULT_SECTED = 'VAULT_SECTED',
}
export enum IWalletEventType {
  SET_CURRENT_VAULT = 'SET_CURRENT_VAULT',
}

export interface BaseSocketEvent {
  sessionId: string;
  address: string;
  to: string;
}

export interface AuthSocketEvent extends BaseSocketEvent {
  channel: SocketChannels.POPUP_AUTH;
  type: IAuthEventType;
}

export interface WalletSocketEvent extends BaseSocketEvent {
  channel: SocketChannels.WALLET;
  type: IWalletEventType;
}

export enum SocketChannels {
  WALLET = '[WALLET]',
  POPUP_AUTH = '[POPUP_AUTH]',
  POPUP_TRANSFER = '[POPUP_TRANSFER]',
}

export interface ISocketEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: AuthSocketEvent | any; // todo: typing all events, and useing or
  to: string;
}

export interface IConnectedSocketUser {
	id: string
	sessionId: string
	username: string
	request_id: string
	time: number
}

export enum SocketEvents {
	CONNECT = 'connection',

	DEFAULT = 'message',

	NOTIFICATION = 'notification',

	CONNECTED = '[CONNECTED]',
	DISCONNECTED = '[CLIENT_DISCONNECTED]',

	TX_CREATE = '[TX_EVENT_CREATED]',
	TX_SIGN = '[TX_EVENT_SIGNED]',
	TX_CONFIRM = '[TX_EVENT_CONFIRMED]',
	TX_REQUEST = '[TX_EVENT_REQUESTED]',
	TX_DELETE = '[TX_EVENT_DELETED]',
	CONNECTION_STATE = '[CONNECTION_STATE]',
	DISCONNECT = '[DISCONNECT]',

	CHANGE_NETWORK = '[CHANGE_NETWORK]',
	NETWORK_CHANGED = '[NETWORK_CHANGED]',
	SWITCH_NETWORK = '[SWITCH_NETWORK]',

	NEW_NOTIFICATION = '[NEW_NOTIFICATION]',
	TRANSACTION = '[TRANSACTION]',
}

export enum SocketUsernames {
	UI = '[UI]',
	CONNECTOR = '[CONNECTOR]',
	API = '[API]',
}

export enum EFuelConnectorsTypes {
	BAKO = 'Bako Safe',
	EVM = 'Ethereum Wallets',
	SOCIAL = 'Social Login',
}

export interface IDefaultMessage {
	username: string
	room: string
	to: SocketUsernames
	type: SocketEvents
	request_id: string
	data: any
}

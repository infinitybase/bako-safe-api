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

	CONNECTED = '[CONNECTED]',
	DISCONNECTED = '[CLIENT_DISCONNECTED]',

	TX_CREATE = '[TX_EVENT_CREATED]',
	TX_SIGN = '[TX_EVENT_SIGNED]',
	TX_CONFIRM = '[TX_EVENT_CONFIRMED]',
	TX_REQUEST = '[TX_EVENT_REQUESTED]',
}

export enum SocketUsernames {
	UI = '[UI]',
	CONNECTOR = '[CONNECTOR]',
	API = '[API]',
}

export interface IDefaultMessage {
	username: string
	room: string
	to: SocketUsernames
	type: SocketEvents
	request_id: string
	data: any
}

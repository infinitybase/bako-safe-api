import { SocketEvents, SocketUsernames } from '@src/types'
import { Network, SelectNetworkArguments, TransactionRequestLike } from 'fuels'
import { Socket } from 'socket.io'
import { DatabaseClass } from '@utils/database'
import { DappService, PredicateService } from '@src/services'

export interface IEventSwitchNetwork_REQUEST {
	_network: SelectNetworkArguments
}

export interface IEventConfirmChangedNetwork {
	network: Network
}

interface IEvent<D> {
	data: D
	socket: Socket
}

export class SwitchNetworkEventHandler {
	private static instance: SwitchNetworkEventHandler

	private dappService: DappService
	private predicateService: PredicateService

	protected constructor(private database: DatabaseClass) {
		this.dappService = new DappService(this.database)
		this.predicateService = new PredicateService(this.database)
	}

	static getInstance(database: DatabaseClass): SwitchNetworkEventHandler {
		if (!SwitchNetworkEventHandler.instance) {
			SwitchNetworkEventHandler.instance = new SwitchNetworkEventHandler(database)
		}

		return SwitchNetworkEventHandler.instance
	}

	async requestSwitchNetwork({ data, socket }: IEvent<IEventSwitchNetwork_REQUEST>) {
		try {
			const { sessionId, username, request_id } = socket.handshake.auth
			const { origin, host } = socket.handshake.headers
			const { auth } = socket.handshake
			const { _network } = data

			const dapp = await this.dappService.getBySessionIdWithPredicate(auth.sessionId)
			console.log(
				'[DAPP]: ',
				JSON.stringify({
					dapp,
					origin,
					host,
				}),
			)
			const isValid = dapp && dapp.origin === origin
			if (!isValid) return

			const vault = await this.predicateService.getById(dapp.current_vault_id)
			if (!vault) return

			const _provider = dapp.network.url.replace(/^https?:\/\/[^@]+@/, 'https://')

			const room = `${sessionId}:${SocketUsernames.UI}:${request_id}`

			socket.to(room).emit(SocketEvents.DEFAULT, {
				username,
				room: sessionId,
				to: SocketUsernames.UI,
				type: SocketEvents.CHANGE_NETWORK,
				data: {
					dapp: {
						name: dapp.name,
						description: dapp.description,
						origin: dapp.origin,
						network: _network,
					},
					vault: {
						name: dapp.current_vault_name,
						description: dapp.current_vault_description,
						address: vault.predicate_address,
						provider: _provider,
					},
					currentNetwork: {
						url: dapp.network.url,
						chainId: dapp.network.chainId,
					},
				},
			})
		} catch (e) {
			console.log(e)
		}
	}

	async confirmationChangedNetwork({ data, socket }: IEvent<IEventConfirmChangedNetwork>) {
		const { sessionId, username, request_id } = socket.handshake.auth
		const connectorRoom = `${sessionId}:${SocketUsernames.CONNECTOR}:${request_id}`

		const { network } = data

		if (!network) throw new Error('New dapp network not found')

		socket.to(connectorRoom).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.CONNECTOR,
			type: SocketEvents.NETWORK_CHANGED,
			data: {
				url: network.url,
				chainId: network.chainId,
			},
		})
	}
}

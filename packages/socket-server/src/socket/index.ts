import { Server as SocketIOServer } from 'socket.io'
import { AxiosInstance } from 'axios'

import { TransactionEventHandler } from '@modules/transactions'
import { SwitchNetworkEventHandler } from '../modules/switchNetwork'

import { SocketEvents, SocketUsernames } from '../types'
import { DatabaseClass, retryWithBackoff } from '@src/utils'
import { logger } from '@src/config/logger'

// import Redis from 'ioredis'
// import { createAdapter } from '@socket.io/redis-adapter'

// const REDIS_URL_READ = process.env.REDIS_URL_READ || 'redis://127.0.0.1:6379'
// const REDIS_URL_WRITE = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379'

// const redisReadClient = new Redis(REDIS_URL_READ)
// const redisWriteClient = new Redis(REDIS_URL_WRITE)

export const setupSocket = (io: SocketIOServer, database: DatabaseClass, api: AxiosInstance) => {
	const transactionEventHandler = TransactionEventHandler.getInstance(database)
	const switchNetworkEventHandler = SwitchNetworkEventHandler.getInstance(database)

	// Configuração do Socket.IO
	io.on(SocketEvents.CONNECT, async socket => {
		const { sessionId, username, request_id } = socket.handshake.auth
		const requestId = request_id === undefined ? '' : request_id

		if (!sessionId || !username) {
			logger.error({ auth: socket.handshake.auth }, '[SOCKET] missing sessionId or username')
			return socket.disconnect(true)
		}

		const room = `${sessionId}:${username}${requestId && `:${requestId}`}`
		logger.info({ room }, '[SOCKET] CONNECTED TO')

		socket.data.messageQueue = []
		await socket.join(room)
		// console.log('Conexão estabelecida com o cliente:', room)
		//console.log('[CONEXAO]: ', socket.handshake.auth, socket.id)

		/* 
            [UI] emite esse evento quando o usuário confirma a tx 
                - verifica se o evento veio da origem correta -> BAKO-UI [http://localhost:5174, https://safe.bako.global]
                - recupera as infos do dapp que está tentando criar a tx pelo sessionId
                - gera uma credencial temporária (code) para ser usada para criar a tx com o pacote bakosafe
                - usa a sdk da bako safe para instanciar o vault connectado ao dapp
                - cria a tx com a sdk da bako safe, usando o code gerado
                - atualiza o sumary da tx
                - invalida credencial temporária (code) utilizada para criar a tx caso usuário não queira assinar a tx
                - emite uma mensagem para a [UI] com o resultado da tx
                - todo: nao muito importante, mas é necessário tipar operations
        */
		socket.on(SocketEvents.TX_CREATE, data => transactionEventHandler.create({ data, socket }))

		/* 
            [UI] emite esse evento quando o usuário assina a tx 
                - verifica se o evento veio da origem correta -> BAKO-UI [http://localhost:5174, https://safe.bako.global]
                - recupera as infos do dapp que está tentando criar a tx pelo sessionId
                - usa uma credencial temporária (code) que é utilizada para criar, assinar e excluir a tx com o pacote bakosafe
                - consome endpoint /transaction/sign/:hash para assinar a tx
                - invalida credencial temporária (code) que foi utilizada para criar, assinar e excluir a tx
                - emite uma mensagem para a [UI] com o resultado da assiantura da tx
            */
		socket.on(SocketEvents.TX_SIGN, data => transactionEventHandler.sign({ data, socket }))

		/*
			      [UI] emite esse evento quando a tx é criada, mas não assinada e o popup é fechado
					    - verifica se o evento veio da origem correta -> BAKO-UI [http://localhost:5174, https://safe.bako.global]
							- recupera as infos do dapp que está tentando criar a tx pelo sessionId
							- usa uma credencial temporária (code) que é utilizada para criar, assinar e excluir a tx com o pacote bakosafe
							- consome o endpoint DELETE - /transaction/by-hash/:hash para excluir a tx
							- invalida credencial temporária (code) que foi utilizada para criar, assinar e excluir a tx
		*/
		socket.on(SocketEvents.TX_DELETE, data => transactionEventHandler.delete({ data, socket }))

		/*
            [CONNECTOR] emite esse evento quando o usuário quer criar uma transação
                - recupera as infos do dapp que está tentando criar a tx pelo sessionId
                - verifica se as informações do dapp estão corretas com as vindas pela mensagem do connector
                - verifica se há transacoes pendentes nesse vault
                - cria um código temporário para ser usado na criação da tx (limite 2 mins)
                - emite uma mensagem para a [UI] com as informações da tx [TX_EVENT_REQUESTED] + o dapp
        */
		socket.on(SocketEvents.TX_REQUEST, data => transactionEventHandler.request({ data, socket }))

		socket.on(SocketEvents.CHANGE_NETWORK, data => switchNetworkEventHandler.requestSwitchNetwork({ data, socket }))

		socket.on(SocketEvents.NETWORK_CHANGED, data => switchNetworkEventHandler.confirmationChangedNetwork({ data, socket }))

		socket.on(SocketEvents.CONNECTION_STATE, async () => {
			const { sessionId, request_id } = socket.handshake.auth
			const connectorRoom = `${sessionId}:${SocketUsernames.CONNECTOR}:${request_id}`

			try {
				const connectionStateUrl = `/connections/${sessionId}/state`
				const { data: connected } = await retryWithBackoff(() => api.get(connectionStateUrl), connectionStateUrl)

				logger.info({ sessionId, connected }, '[SOCKET] Connected state for session')

				io.to(connectorRoom).emit(SocketEvents.CONNECTION_STATE, {
					username: SocketUsernames.CONNECTOR,
					request_id,
					room: sessionId,
					to: SocketUsernames.CONNECTOR,
					type: SocketEvents.CONNECTION_STATE,
					data: connected,
				})
			} catch (error) {
				logger.error(
					{
						message: error.message,
						status: error.response?.status,
						url: error.config?.url,
					},
					'[SOCKET] Error fetching connection state for session',
				)
				// Returns an error response to the client
				io.to(connectorRoom).emit(SocketEvents.CONNECTION_STATE, {
					username: SocketUsernames.CONNECTOR,
					request_id,
					room: sessionId,
					to: SocketUsernames.CONNECTOR,
					type: SocketEvents.CONNECTION_STATE,
					data: false,
				})
			}
		})

		// Lidar com mensagens recebidas do cliente
		socket.on(SocketEvents.DEFAULT, data => {
			const { sessionId, to, request_id } = data
			// console.log('[SOCKET]: RECEIVED MESSAGE FROM', sessionId, to, request_id)
			const requestId = request_id === undefined ? '' : request_id
			const room = `${sessionId}:${to}:${requestId}`

			socket.to(room).emit(SocketEvents.DEFAULT, data)
		})

		socket.on(SocketEvents.TRANSACTION, data => {
			const { sessionId, to } = data
			const room = `${sessionId}:${to}`
			const clientsInRoom = io.sockets.adapter.rooms.get(room) || new Set()
			if (clientsInRoom.size > 0) {
				socket.to(room).emit(SocketEvents.TRANSACTION, data)
			}
		})

		socket.on(SocketEvents.SWITCH_NETWORK, data => {
			const { sessionId, to } = data
			const room = `${sessionId}:${to}`
			const clientsInRoom = io.sockets.adapter.rooms.get(room) || new Set()
			logger.info({ data }, '[SOCKET SERVER] [SWITCH_NETWORK] Event')
			if (clientsInRoom.size > 0) {
				socket.to(room).emit(SocketEvents.SWITCH_NETWORK, data)
			}
		})

		socket.on(SocketEvents.BALANCE_OUTDATED_USER, data => {
			const { sessionId, to } = data
			const room = `${sessionId}:${to}`
			const clientsInRoom = io.sockets.adapter.rooms.get(room) || new Set()
			if (clientsInRoom.size > 0) {
				socket.to(room).emit(SocketEvents.BALANCE_OUTDATED_USER, data)
			}
		})

		socket.on(SocketEvents.BALANCE_OUTDATED_PREDICATE, data => {
			const { sessionId, to } = data
			const room = `${sessionId}:${to}`
			const clientsInRoom = io.sockets.adapter.rooms.get(room) || new Set()
			if (clientsInRoom.size > 0) {
				socket.to(room).emit(SocketEvents.BALANCE_OUTDATED_PREDICATE, data)
			}
		})

		socket.on(SocketEvents.NOTIFICATION, data => {
			const { sessionId, to } = data
			const room = `${sessionId}:${to}`

			socket.to(room).emit(SocketEvents.NOTIFICATION, data)
		})

		socket.on('disconnect', () => {
			// console.log('Cliente desconectado:', socket.handshake.auth)
			// biome-ignore lint/complexity/noForEach: <explanation>
			socket.rooms.forEach(room => socket.leave(room))
			socket.removeAllListeners()
			socket.data.messageQueue = []
		})
	})

	// redisReadClient.on('error', err => console.error('Redis Pub Client Error:', err))
	// redisWriteClient.on('error', err => console.error('Redis Sub Client Error:', err))

	// io.adapter(createAdapter(redisReadClient, redisWriteClient))
}

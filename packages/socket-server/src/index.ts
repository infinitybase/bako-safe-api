import http from 'http'
import express from 'express'
import socketIo from 'socket.io'
import axios from 'axios'
import Redis from 'ioredis'
import { createAdapter } from '@socket.io/redis-adapter'

import { TransactionEventHandler } from '@modules/transactions'
import { DatabaseClass } from '@utils/database'
import { SocketEvents } from './types'

const { SOCKET_PORT, SOCKET_TIMEOUT_DICONNECT, SOCKET_NAME, API_URL } = process.env

// const REDIS_URL_READ = process.env.REDIS_URL_READ || 'redis://127.0.0.1:6379'
// const REDIS_URL_WRITE = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379'

// const redisReadClient = new Redis(REDIS_URL_READ)
// const redisWriteClient = new Redis(REDIS_URL_WRITE)

const app = express()
const server = http.createServer(app)
export const io = new socketIo.Server(server, {
	connectTimeout: Number(SOCKET_TIMEOUT_DICONNECT), // 60 mins
	cors: {
		origin: '*',
	},
})
export const api = axios.create({
	baseURL: API_URL,
})

// redisReadClient.on('error', err => console.error('Redis Pub Client Error:', err))
// redisWriteClient.on('error', err => console.error('Redis Sub Client Error:', err))

// io.adapter(createAdapter(redisReadClient, redisWriteClient))

let database: DatabaseClass
let transactionEventHandler: TransactionEventHandler

// Health Check
app.get('/health', ({ res }) => res.status(200).send({ status: 'ok', message: `Health check ${SOCKET_NAME} passed` }))

// Configuração do Socket.IO
io.on(SocketEvents.CONNECT, async socket => {
	const { sessionId, username, request_id } = socket.handshake.auth
	const requestId = request_id === undefined ? '' : request_id

	const room = `${sessionId}:${username}${requestId && `:${requestId}`}`

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
			- usa uma credencial temporária (code) que é utilizada para criar e assinar a tx com o pacote bakosafe
			- consome endpoint /transaction/sign/:hash para assinar a tx
			- invalida credencial temporária (code) que foi utilizada para criar e assinar a tx
			- emite uma mensagem para a [UI] com o resultado da assiantura da tx
		*/
	socket.on(SocketEvents.TX_SIGN, data => transactionEventHandler.sign({ data, socket }))

	/*
		[CONNECTOR] emite esse evento quando o usuário quer criar uma transação
			- recupera as infos do dapp que está tentando criar a tx pelo sessionId
			- verifica se as informações do dapp estão corretas com as vindas pela mensagem do connector
			- verifica se há transacoes pendentes nesse vault
			- cria um código temporário para ser usado na criação da tx (limite 2 mins)
			- emite uma mensagem para a [UI] com as informações da tx [TX_EVENT_REQUESTED] + o dapp
	 */
	socket.on(SocketEvents.TX_REQUEST, data => transactionEventHandler.request({ data, socket }))

	// Lidar com mensagens recebidas do cliente
	socket.on(SocketEvents.DEFAULT, data => {
		const { sessionId, to, request_id } = data
		// console.log('[SOCKET]: RECEIVED MESSAGE FROM', sessionId, to, request_id)
		const requestId = request_id === undefined ? '' : request_id
		const room = `${sessionId}:${to}:${requestId}`

		// console.log('[SOCKET]: SEND MESSAGE TO', room)

		socket.to(room).emit(SocketEvents.DEFAULT, data)
	})

	socket.on(SocketEvents.NOTIFICATION, data => {
		const { sessionId, to } = data
		const room = `${sessionId}:${to}`
		// console.log('[SOCKET]: REAL TIME MESSAGE TO FRONT', {
		// 	room, data
		// })

		socket.to(room).emit(SocketEvents.NOTIFICATION, data)
	})

	socket.on('disconnect', () => {
		// console.log('Cliente desconectado:', socket.handshake.auth)
		socket.disconnect(true)
		// biome-ignore lint/complexity/noForEach: <explanation>
		socket.rooms.forEach(room => socket.leave(room))
		socket.removeAllListeners()
		socket.data.messageQueue = []
	})
})

const databaseConnect = async () => {
	database = await DatabaseClass.connect()
}

const setupEventHandlers = () => {
	transactionEventHandler = TransactionEventHandler.getInstance(database)
}

// Iniciar o servidor
const port = SOCKET_PORT || 3000
server.listen(port, async () => {
	await databaseConnect()
	setupEventHandlers()
	console.log(`Server runner on port ${port}`)
})

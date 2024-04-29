import { txConfirm, txRequest } from './modules/transactions'
import { SocketEvents } from './types'
import express from 'express'
import http from 'http'
import socketIo from 'socket.io'

const { PORT, TIMEOUT_DICONNECT, APP_NAME } = process.env

const app = express()
const server = http.createServer(app)
const io = new socketIo.Server(server, {
	cors: {
		origin: '*',
	},
	connectTimeout: Number(TIMEOUT_DICONNECT), // 1 hora
})
// Endpoint de teste para o Express
app.get('/', (req, res) => {
	res.status(200)
	res.json({ message: `${APP_NAME} ${new Date()}` })
})

// Configuração do Socket.IO
io.on(SocketEvents.CONNECT, async socket => {
	console.log('Conexão estabelecida com o cliente:', socket.handshake.auth)
	const { sessionId, username, request_id } = socket.handshake.auth
	await socket.join(`${sessionId}:${username}:${request_id}`)
	//console.log('[CONEXAO]: ', socket.handshake.auth, socket.id)
	/* 
		[UI] emite esse evento quando o usuário confirma a tx 
			- verifica se o evento veio da origem correta -> BAKO-UI [http://localhost:5174, https://safe.bako.global]
			- recupera as infos do dapp que está tentando criar a tx pelo sessionId
			- gera uma credencial temporária (code) para ser usada para criar a tx com o pacote bakosafe
			- usa a sdk da bako safe para instanciar o vault connectado ao dapp
			- cria a tx com a sdk da bako safe, usando o code gerado
			- atualiza o sumary da tx
			- cria uma invalidacao para o code gerado
			- emite uma mensagem para o [CONNECTOR] com o resultado da tx [TX_EVENT_CONFIRMED] ou [TX_EVENT_FAILED]
			- todo: nao muito importante, mas é necessário tipar operations
	*/
	socket.on(SocketEvents.TX_CONFIRM, data => txConfirm({ data, socket }))

	/*
		[CONNECTOR] emite esse evento quando o usuário quer criar uma transação
			- recupera as infos do dapp que está tentando criar a tx pelo sessionId
			- verifica se as informações do dapp estão corretas com as vindas pela mensagem do connector
			- verifica se há transacoes pendentes nesse vault
			- cria um código temporário para ser usado na criação da tx (limite 2 mins)
			- emite uma mensagem para a [UI] com as informações da tx [TX_EVENT_REQUESTED] + o dapp
	 */
	socket.on(SocketEvents.TX_REQUEST, data => txRequest({ data, socket }))

	// Lidar com mensagens recebidas do cliente
	socket.on(SocketEvents.DEFAULT, data => {
		const { sessionId, to, request_id } = data
		const room = `${sessionId}:${to}:${request_id}`
		console.log('Mensagem recebida do cliente:', {
			data,
		})
		socket.to(room).emit(SocketEvents.DEFAULT, data)
	})
})

// Iniciar o servidor
const port = PORT || 3000
server.listen(port, () => {
	console.log(`Server runner on port ${port}`)
})

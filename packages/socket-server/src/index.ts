import http from 'http'
import express from 'express'
import socketIo from 'socket.io'
import axios from 'axios'

import { DatabaseClass } from '@utils/database'
import { setupSocket } from './socket'
import { logger } from '@src/config/logger'

const { SOCKET_PORT, SOCKET_TIMEOUT_DICONNECT, SOCKET_NAME, API_URL } = process.env

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

// Health Check
app.get('/health', ({ res }) => res.status(200).send({ status: 'ok', message: `Health check ${SOCKET_NAME} passed` }))

const startServer = async () => {
	const database = await DatabaseClass.connect()

	setupSocket(io, database, api)

	server.listen(SOCKET_PORT || 3000, () => {
		logger.info(`Server running on port ${SOCKET_PORT || 3000}`)
	})
}

startServer()

import { SocketEvents, SocketUsernames } from '@src/types'
import { DatabaseClass } from '@src/utils/database'
import { BakoSafe, TransactionStatus, Vault } from 'bakosafe'
import crypto from 'crypto'
import { TransactionRequestLike } from 'fuels'
import { Socket } from 'socket.io'

export interface IEventTX_REQUEST {
	_transaction: TransactionRequestLike
	_address: string
}

export interface IEventTX_CONFIRM {
	tx: TransactionRequestLike
	operations: any
}

const { BAKO_URL_UI, BAKO_URL_API } = process.env

export const txConfirm = async ({ data, socket }: { data: IEventTX_CONFIRM; socket: Socket }) => {
	const { sessionId, username, request_id } = socket.handshake.auth
	const room = `${sessionId}:${SocketUsernames.CONNECTOR}:${request_id}`
	const { origin, host } = socket.handshake.headers
	console.log(data)
	const { tx, operations } = data
	const { auth } = socket.handshake
	try {
		// ------------------------------ [VALIDACOES] ------------------------------

		console.log('[TX_EVENT_CONFIRM]', socket.handshake.headers, origin, BAKO_URL_UI)
		// validar se o origin é diferente da url usada no front...adicionar um .env pra isso

		if (origin != BAKO_URL_UI) return
		console.log('[PASSOU PELO RETURN]: ')
		const database = await DatabaseClass.connect()

		// ------------------------------ [VALIDACOES] ------------------------------

		// ------------------------------ [DAPP] ------------------------------
		const dapp = await database.query(`
				SELECT d.*, u.id AS user_id, u.address AS user_address, c.id AS current_vault_id
				FROM dapp d
				JOIN "users" u ON d.user = u.id
				JOIN "predicates" c ON d.current = c.id
				WHERE d.session_id = '${auth.sessionId}'  
			`)
		// console.log('[DAPP]: ', dapp)
		if (!dapp) return
		// ------------------------------ [CODE] ------------------------------
		const code = await database.query(`
				SELECT *
				FROM recover_codes
				WHERE origin = '${host}' 
				AND owner = '${dapp.user_id}'
				AND used = false
				AND valid_at > NOW()
				ORDER BY valid_at DESC
				LIMIT 1;
			`)
		if (!code) return
		// console.log('[CODE]', code)
		// ------------------------------ [CODE] ------------------------------

		// ------------------------------ [TX] ------------------------------
		// console.log('[chamando predicate]', dapp.current_vault_id, dapp.user_address, code.code)
		BakoSafe.setup({
			SERVER_URL: BAKO_URL_API,
		})
		const predicate = await Vault.create({
			id: dapp.current_vault_id,
			address: dapp.user_address,
			token: code.code,
		})
		console.log('[predicate]', !!predicate)
		console.log('[pre]', !!tx, tx)
		const _tx = await predicate
			.BakoSafeIncludeTransaction(tx)
			.then(tx => tx)
			.catch(e => {
				console.log('[ERRO NA TX]', e)
				return undefined
			})
		console.log('[tx]', !!_tx)
		// ------------------------------ [TX] ------------------------------

		// ------------------------------ [SUMMARY] ------------------------------
		await database.query(`
				UPDATE transactions
				SET summary = '${JSON.stringify({
					operations: operations.operations,
					name: dapp.name,
					origin: dapp.origin,
				})}'
				WHERE id = '${_tx.BakoSafeTransactionId}'
			`)
		// ------------------------------ [SUMMARY] ------------------------------

		// ------------------------------ [INVALIDATION] ------------------------------
		await database.query(`
				DELETE FROM recover_codes
				WHERE id = '${code.id}'
			`)
		// ------------------------------ [INVALIDATION] ------------------------------

		// ------------------------------ [EMIT] ------------------------------
		console.log('[MENSAGEM ENVIADA]: ', {
			username,
			room: sessionId,
			to: SocketUsernames.CONNECTOR,
			type: SocketEvents.TX_CONFIRM,
			data: {
				id: _tx.getHashTxId(),
				status: '[SUCCESS]',
			},
		})
		socket.to(room).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.CONNECTOR,
			type: SocketEvents.TX_CONFIRM,
			data: {
				id: _tx.getHashTxId(),
				status: '[SUCCESS]',
			},
		})
		// ------------------------------ [EMIT] ------------------------------
	} catch (e) {
		console.log(e)
		socket.to(room).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.CONNECTOR,
			type: SocketEvents.TX_REQUEST,
			data: {
				id: undefined,
				status: '[ERROR]',
			},
		})
	}
}

export const txRequest = async ({ data, socket }: { data: IEventTX_REQUEST; socket: Socket }) => {
	try {
		const { sessionId, username, request_id } = socket.handshake.auth
		const { _transaction } = data
		const { origin, host } = socket.handshake.headers
		const { auth } = socket.handshake
		// console.log(socket.handshake.headers)
		const database = await DatabaseClass.connect()
		//console.log('[TX_EVENT_REQUEST]', socket.handshake.headers)

		const dapp = await database.query(`
				SELECT d.*, u.id AS user_id,
				u.address AS user_address,
				c.id AS current_vault_id, 
				c.name AS current_vault_name, 
				c.description AS current_vault_description, 
				c.provider AS current_vault_provider
				FROM dapp d
				JOIN "users" u ON d.user = u.id
				JOIN "predicates" c ON d.current = c.id
				WHERE d.session_id = '${auth.sessionId}'  
			`)
		const isValid = dapp && dapp.origin === origin

		//todo: adicionar emissao de erro
		if (!isValid) return

		const vault = await database.query(`
				SELECT * from predicates
				WHERE id = '${dapp.current_vault_id}'
			`)

		if (!vault) return

		const code = await database.query(`
				INSERT INTO recover_codes (origin, owner, type, code, valid_at, metadata, used)
				VALUES ('${host}', '${dapp.user_id}', 'AUTH_ONCE', 'code${crypto.randomUUID()}',
				NOW() + INTERVAL '2 minutes', '${JSON.stringify({ uses: 0 })}', false)
				RETURNING *;
			`)

		const tx_pending = await database.query(`
				SELECT COUNT(*)
				FROM transactions t
				WHERE t.predicate_id = '${vault.id}' 
				AND t.status = '${TransactionStatus.AWAIT_REQUIREMENTS}'
				AND t.deleted_at IS NULL;
			`)
		//console.log('[TX_PENDING]', tx_pending, Number(tx_pending.count) > 0)

		const room = `${sessionId}:${SocketUsernames.UI}:${request_id}`
		console.log('[TUDO OK POR AQUI, ENVIANDO AO FRONT]: ', room)
		socket.to(room).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			to: SocketUsernames.UI,
			type: SocketEvents.TX_REQUEST,
			data: {
				dapp: {
					name: dapp.name,
					description: dapp.description,
					origin: dapp.origin,
				},
				vault: {
					name: dapp.current_vault_name,
					description: dapp.current_vault_description,
					address: vault.predicateAddress,
					provider: dapp.current_vault_provider,
					pending_tx: Number(tx_pending.count) > 0,
				},
				tx: _transaction,
				validAt: code.valid_at,
			},
		})
	} catch (e) {
		console.log(e)
	}
}

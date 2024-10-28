import { SocketEvents, SocketUsernames } from '@src/types'
import { BakoProvider, ITransactionSummary, TransactionStatus, Vault } from 'bakosafe'
import crypto from 'crypto'
import { Provider, TransactionRequestLike } from 'fuels'
import { Socket } from 'socket.io'
import { DatabaseClass } from '@utils/database'
import { io, api } from '..'

export interface IEventTX_REQUEST {
	_transaction: TransactionRequestLike
	_address: string
}

export interface IEventTX_CREATE {
	tx: TransactionRequestLike
	operations: any
	sign?: boolean
}

export interface IEventTX_SIGN {
	hash: string
	signedMessage: string
}

enum IEventTX_STATUS {
	SUCCESS = 'SUCCESS',
	ERROR = 'ERROR',
}

interface IEvent<D> {
	data: D
	socket: Socket
	database: DatabaseClass
}

const { UI_URL, API_URL } = process.env

export const txSign = async ({ data, socket, database }: IEvent<IEventTX_SIGN>) => {
	const { sessionId, username, request_id } = socket.handshake.auth
	const { origin, host } = socket.handshake.headers

	const { hash, signedMessage } = data
	const room = `${sessionId}:${SocketUsernames.UI}:${request_id}`

	const { auth } = socket.handshake

	try {
		if (origin != UI_URL) throw new Error('Invalid origin')

		// ------------------------------ [DAPP] ------------------------------
		const dapp = await database.query(
			`
				SELECT d.*, u.id AS user_id, u.address AS user_address
				FROM dapp d
				JOIN "users" u ON d.user = u.id
				WHERE d.session_id = $1
			`,
			[auth.sessionId],
		)

		if (!dapp) throw new Error('Dapp not found')

		// ------------------------------ [CODE] ------------------------------
		const code = await database.query(
			`
				SELECT code
				FROM recover_codes
				WHERE origin = $1
				AND owner = $2
				AND used = false
				AND valid_at > NOW()
				ORDER BY valid_at DESC
				LIMIT 1;
			`,
			[host, dapp.user_id],
		)

		if (!code.code) throw new Error('Recover code not found')

		// ---------------------[VALIDATE SIGNATURE] -------------------------
		await api.put(
			`/transaction/sign/${hash}`,
			{
				signature: signedMessage,
				approve: true,
			},
			{
				headers: {
					authorization: code.code,
					signeraddress: dapp.user_address,
				},
			},
		)

		// ------------------------------ [INVALIDATION] ------------------------------
		await database
			.query(
				`
					DELETE FROM recover_codes
					WHERE id = $1
				`,
				[code.id],
			)
			.catch(error => console.error(error))

		// ------------------------------ [EMIT] ------------------------------
		io.to(room).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.UI,
			type: SocketEvents.TX_SIGN,
			data: {
				status: IEventTX_STATUS.SUCCESS,
			},
		})
	} catch (e) {
		io.to(room).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.UI,
			type: SocketEvents.TX_SIGN,
			data: {
				status: IEventTX_STATUS.ERROR,
			},
		})
	}
}

// [MOSTRAR TX]
export const txCreate = async ({ data, socket, database }: IEvent<IEventTX_CREATE>) => {
	const { sessionId, username, request_id } = socket.handshake.auth
	const { origin, host } = socket.handshake.headers

	const { tx, operations, sign } = data

	const uiRoom = `${sessionId}:${SocketUsernames.UI}:${request_id}`
	const connectorRoom = `${sessionId}:${SocketUsernames.CONNECTOR}:${request_id}`

	const { auth } = socket.handshake

	try {
		// ------------------------------ [VALIDACOES] ------------------------------
		// validar se o origin é diferente da url usada no front...adicionar um .env pra isso
		if (origin != UI_URL) throw new Error('Invalid origin')

		// ------------------------------ [DAPP] ------------------------------
		const dapp = await database.query(
			`
				SELECT d.*, u.id AS user_id, u.address AS user_address, c.id AS current_vault_id, c.predicate_address AS current_vault_address
				FROM dapp d
				JOIN "users" u ON d.user = u.id
				JOIN "predicates" c ON d.current = c.id
				WHERE d.session_id = $1  
			`,
			[auth.sessionId],
		)

		if (!dapp) throw new Error('Dapp not found')

		// ------------------------------ [CODE] ------------------------------
		const code = await database.query(
			`
				SELECT *
				FROM recover_codes
				WHERE origin = $1
				AND owner = $2
				AND used = false
				AND valid_at > NOW()
				ORDER BY valid_at DESC
				LIMIT 1;
			`,
			[host, dapp.user_id],
		)

		if (!code) throw new Error('Recover code not found')

		// ------------------------------ [CODE] ------------------------------

		// ------------------------------ [TX] ------------------------------
		const vaultProvider = await BakoProvider.create(dapp.network.url, {
			token: code.code,
			address: dapp.user_address,
			serverApi: API_URL,
		})
		const vault = await Vault.fromAddress(dapp.current_vault_address, vaultProvider)
		const _tx = await vault.BakoTransfer(tx)

		// ------------------------------ [TX] ------------------------------

		// ------------------------------ [SUMMARY] ------------------------------
		const transactionSummary: ITransactionSummary = {
			type: 'connector',
			name: dapp.name,
			origin: dapp.origin,
			operations: operations.operations,
		}
		await database.query(
			`
				UPDATE transactions
				SET summary = $1
				WHERE hash = '${_tx.hashTxId}'
			`,
			[JSON.stringify(transactionSummary)],
		)
		// ------------------------------ [SUMMARY] ------------------------------

		// ------------------------------ [INVALIDATION] ------------------------------
		if (!sign) {
			await database
				.query(
					`
					DELETE FROM recover_codes
					WHERE id = $1
				`,
					[code.id],
				)
				.catch(error => console.error(error))
		}
		// ------------------------------ [INVALIDATION] ------------------------------

		// ------------------------------ [EMIT] ------------------------------
		// Confirm tx creation to UI
		io.to(uiRoom).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.UI,
			type: SocketEvents.TX_CREATE,
			data: {
				hash: _tx.hashTxId,
				status: IEventTX_STATUS.SUCCESS,
				sign,
			},
		})

		// Confirm tx creation to CONNECTOR
		socket.to(connectorRoom).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.CONNECTOR,
			type: SocketEvents.TX_CONFIRM,
			data: {
				id: _tx.hashTxId,
				status: IEventTX_STATUS.SUCCESS,
			},
		})
		// ------------------------------ [EMIT] ------------------------------
	} catch (e) {
		io.to(uiRoom).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			to: SocketUsernames.UI,
			type: SocketEvents.TX_CREATE,
			data: {
				status: IEventTX_STATUS.ERROR,
			},
		})
	}
}

export const txRequest = async ({ data, socket, database }: IEvent<IEventTX_REQUEST>) => {
	try {
		const { sessionId, username, request_id } = socket.handshake.auth
		const { _transaction } = data
		const { origin, host } = socket.handshake.headers
		const { auth } = socket.handshake

		const dapp = await database.query(
			`
				SELECT d.*, u.id AS user_id,
				u.address AS user_address,
				c.id AS current_vault_id, 
				c.name AS current_vault_name, 
				c.description AS current_vault_description
				FROM dapp d
				JOIN "users" u ON d.user = u.id
				JOIN "predicates" c ON d.current = c.id
				WHERE d.session_id = $1  
			`,
			[auth.sessionId],
		)
		const isValid = dapp && dapp.origin === origin

		//todo: adicionar emissao de erro
		if (!isValid) return

		const vault = await database.query(
			`
				SELECT p.*, pv.code AS version_code
				FROM predicates p
				JOIN predicate_versions pv ON p.version_id = pv.id
				WHERE p.id = $1
			`,
			[dapp.current_vault_id],
		)

		if (!vault) return

		const code = await database.query(
			`
				INSERT INTO recover_codes (origin, owner, type, code, valid_at, metadata, used, network)
				VALUES ($1, $2, 'AUTH_ONCE', $3, NOW() + INTERVAL '2 minutes', $4, false, $5)
				RETURNING *;
			`,
			[host, dapp.user_id, `code${crypto.randomUUID()}`, `${JSON.stringify({ uses: 0 })}`, JSON.stringify(dapp.network)],
		)

		const tx_pending = await database.query(
			`
				SELECT COUNT(*)
				FROM transactions t
				WHERE t.predicate_id = $1 
				AND t.status = $2
				AND t.deleted_at IS NULL
				AND regexp_replace(t.network->>'url', '^https?://[^@]+@', 'https://') = $3;
			`,
			[vault.id, TransactionStatus.AWAIT_REQUIREMENTS, dapp.network.url],
		)

		const provider = await Provider.create(dapp.network.url)
		const vaultInstance = new Vault(provider, JSON.parse(vault.configurable))
		const { tx } = await vaultInstance.BakoTransfer(_transaction)

		const room = `${sessionId}:${SocketUsernames.UI}:${request_id}`
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
					address: vault.predicate_address,
					provider: dapp.network.url,
					pending_tx: Number(tx_pending.count) > 0,
					configurable: vault.configurable,
					version: vault.version_code,
				},
				tx,
				validAt: code.valid_at,
			},
		})
	} catch (e) {
		console.log(e)
	}
}

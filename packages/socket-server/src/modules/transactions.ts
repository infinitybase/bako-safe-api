import { SocketEvents, SocketUsernames } from '@src/types'
import { BakoProvider, ITransactionSummary, TransactionStatus, Vault } from 'bakosafe'
import crypto from 'crypto'
import { Provider, TransactionRequestLike } from 'fuels'
import { Socket } from 'socket.io'
import { DatabaseClass } from '@utils/database'

export interface IEventTX_REQUEST {
	_transaction: TransactionRequestLike
	_address: string
}

export interface IEventTX_CONFIRM {
	tx: TransactionRequestLike
	operations: any
	//sign?: boolean [CONNECTOR SIGNATURE]
}

// [CONNECTOR SIGNATURE]
// export interface IEventTX_SIGN {
// 	id: string
// 	hash: string
// 	signedMessage: string
// }

interface IEvent<D> {
	data: D
	socket: Socket
	database: DatabaseClass
}

const { UI_URL, API_URL } = process.env

// [CONNECTOR SIGNATURE]
// export const txSign = async ({ data, socket, database }: IEvent<IEventTX_SIGN>) => {
// 	const { sessionId, username, request_id } = socket.handshake.auth
// 	const { origin, host } = socket.handshake.headers

// 	const { id, hash, signedMessage } = data
// 	const room = `${sessionId}:${SocketUsernames.CONNECTOR}:${request_id}`

// 	const { auth } = socket.handshake

// 	try {
// 		if (origin != UI_URL) return

// 		// ------------------------------ [DAPP] ------------------------------
// 		const dapp = await database.query(
// 			`
// 				SELECT d.*, u.id AS user_id, u.address AS user_address, c.id AS current_vault_id, c.provider AS current_vault_provider
// 				FROM dapp d
// 				JOIN "users" u ON d.user = u.id
// 				JOIN "predicates" c ON d.current = c.id
// 				WHERE d.session_id = $1
// 			`,
// 			[auth.sessionId],
// 		)

// 		if (!dapp) return

// 		// ------------------------------ [CODE] ------------------------------
// 		const code = await database.query(
// 			`
// 				SELECT *
// 				FROM recover_codes
// 				WHERE origin = $1
// 				AND owner = $2
// 				AND used = false
// 				AND valid_at > NOW()
// 				ORDER BY valid_at DESC
// 				LIMIT 1;
// 			`,
// 			[host, dapp.user_id],
// 		)

// 		if (!code) return

// 		// ---------------------[VALIDATE SIGNATURE] -------------------------
// 		await api.put(
// 			`/transaction/signer/${id}`,
// 			{
// 				account: dapp.user_address,
// 				signer: signedMessage,
// 				confirm: true,
// 			},
// 			{
// 				headers: {
// 					authorization: code.code,
// 					signerAddress: dapp.user_address,
// 				},
// 			},
// 		)

// 		// ---------------------[EXECUTE TRANSACTION] -------------------------
// 		// const vault = await Vault.create({
// 		// 	id: dapp.current_vault_id,
// 		// 	token: code.code,
// 		// 	address: dapp.user_address,
// 		// })

// 		// const transfer = await vault.BakoSafeGetTransaction(id)

// 		// await transfer.wait()

// 		// ------------------------------ [EMIT] ------------------------------
// 		socket.to(room).emit(SocketEvents.DEFAULT, {
// 			username,
// 			room: sessionId,
// 			request_id,
// 			to: SocketUsernames.CONNECTOR,
// 			type: SocketEvents.TX_CONFIRM,
// 			data: {
// 				id: hash,
// 				status: '[SUCCESS]',
// 			},
// 		})
// 	} catch (e) {
// 		// TODO: adicionar tratamento de error
// 		console.log(e)
// 	}
// }

// [MOSTRAR TX]
export const txConfirm = async ({ data, socket, database }: IEvent<IEventTX_CONFIRM>) => {
	const { sessionId, username, request_id } = socket.handshake.auth
	const { origin, host } = socket.handshake.headers

	const { tx, operations } = data

	const room = `${sessionId}:${SocketUsernames.CONNECTOR}:${request_id}`

	const { auth } = socket.handshake

	try {
		// ------------------------------ [VALIDACOES] ------------------------------
		// validar se o origin é diferente da url usada no front...adicionar um .env pra isso
		console.log('[TX_CONFIRM]', {
			origin,
			UI_URL,
			room,
			_origin: origin != UI_URL,
		})

		if (origin != UI_URL) return

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

		if (!dapp) return

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

		if (!code) return

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
		await database.query(
			`
				DELETE FROM recover_codes
				WHERE id = $1
			`,
			[code.id],
		)
		// ------------------------------ [INVALIDATION] ------------------------------

		// ------------------------------ [EMIT] ------------------------------
		socket.to(room).emit(SocketEvents.DEFAULT, {
			username,
			room: sessionId,
			request_id,
			//to, [CONNECTOR SIGNATURE]
			to: SocketUsernames.CONNECTOR,
			type: SocketEvents.TX_CONFIRM,
			data: {
				//id: _tx.BakoSafeTransactionId, [CONNECTOR SIGNATURE]
				//hash: _tx.hashTxId, [CONNECTOR SIGNATURE]
				id: _tx.hashTxId,
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
			//to, [CONNECTOR SIGNATURE]
			to: SocketUsernames.CONNECTOR,
			type: SocketEvents.TX_REQUEST,
			data: {
				id: undefined,
				status: '[ERROR]',
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
				INSERT INTO recover_codes (origin, owner, type, code, valid_at, metadata, used)
				VALUES ($1, $2, 'AUTH_ONCE', $3, NOW() + INTERVAL '2 minutes', $4, false)
				RETURNING *;
			`,
			[host, dapp.user_id, `code${crypto.randomUUID()}`, `${JSON.stringify({ uses: 0 })}`],
		)

		const tx_pending = await database.query(
			`
				SELECT COUNT(*)
				FROM transactions t
				WHERE t.predicate_id = $1 
				AND t.status = $2
				AND t.deleted_at IS NULL;
			`,
			[vault.id, TransactionStatus.AWAIT_REQUIREMENTS],
		)
		// const provider = await BakoProvider.create(dapp.network.url, {
		// 	token: code.code,
		// 	address: dapp.user_address,
		// 	serverApi: API_URL,
		// })

		// // here
		// const vaultInstance = await Vault.fromAddress(vault.predicate_address, provider)
		// await vaultInstance.BakoTransfer(_transaction)

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

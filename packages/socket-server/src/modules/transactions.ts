import { SocketEvents, SocketUsernames } from '@src/types'
import { BakoProvider, ITransactionSummary, Vault } from 'bakosafe'
import crypto from 'crypto'
import { Provider, TransactionRequestLike } from 'fuels'
import { Socket } from 'socket.io'
import { DatabaseClass } from '@utils/database'
import { io, api } from '..'
import { DappQuery, PredicateQuery, RecoverCodeQuery, TransactionQuery } from '@src/utils/queries'

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
}

const { UI_URL, API_URL } = process.env

export class TransactionEventHandler {
	private static instance: TransactionEventHandler

	private dappQuery: DappQuery
	private recoverCodeQuery: RecoverCodeQuery
	private predicateQuery: PredicateQuery
	private transactionQuery: TransactionQuery

	protected constructor(private database: DatabaseClass) {
		this.dappQuery = new DappQuery(this.database)
		this.recoverCodeQuery = new RecoverCodeQuery(this.database)
		this.predicateQuery = new PredicateQuery(this.database)
		this.transactionQuery = new TransactionQuery(this.database)
	}

	static instantiate(database: DatabaseClass): TransactionEventHandler {
		if (!TransactionEventHandler.instance) {
			TransactionEventHandler.instance = new TransactionEventHandler(database)
		}

		return TransactionEventHandler.instance
	}

	async request({ data, socket }: IEvent<IEventTX_REQUEST>) {
		try {
			const { sessionId, username, request_id } = socket.handshake.auth
			const { _transaction } = data
			const { origin, host } = socket.handshake.headers
			const { auth } = socket.handshake

			const dapp = await this.dappQuery.getBySessionIdWithPredicate(auth.sessionId)

			const isValid = dapp && dapp.origin === origin

			//todo: adicionar emissao de erro
			if (!isValid) return

			const vault = await this.predicateQuery.getById(dapp.current_vault_id)

			if (!vault) return

			const code = await this.recoverCodeQuery.create({
				origin: host,
				userId: dapp.user_id,
				code: `code${crypto.randomUUID()}`,
				metadata: `${JSON.stringify({ uses: 0 })}`,
				network: JSON.stringify(dapp.network),
			})

			const tx_pending = await this.transactionQuery.countPending({
				predicateId: vault.id,
				networkUrl: dapp.network.url,
			})

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

	async create({ data, socket }: IEvent<IEventTX_CREATE>) {
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
			const dapp = await this.dappQuery.getBySessionIdWithPredicate(auth.sessionId)

			if (!dapp) throw new Error('Dapp not found')

			// ------------------------------ [CODE] ------------------------------
			const code = await this.recoverCodeQuery.getValid({ origin: host, userId: dapp.user_id })

			if (!code.code) throw new Error('Recover code not found')

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
			await this.transactionQuery.updateSummary({
				hash: _tx.hashTxId,
				summary: JSON.stringify(transactionSummary),
			})
			// ------------------------------ [SUMMARY] ------------------------------

			// ------------------------------ [INVALIDATION] ------------------------------
			if (!sign) {
				await this.recoverCodeQuery.delete(code.id).catch(error => console.error(error))
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

	async sign({ data, socket }: IEvent<IEventTX_SIGN>) {
		const { sessionId, username, request_id } = socket.handshake.auth
		const { origin, host } = socket.handshake.headers

		const { hash, signedMessage } = data
		const room = `${sessionId}:${SocketUsernames.UI}:${request_id}`

		const { auth } = socket.handshake

		try {
			if (origin != UI_URL) throw new Error('Invalid origin')

			// ------------------------------ [DAPP] ------------------------------

			const dapp = await this.dappQuery.getBySessionId(auth.sessionId)

			if (!dapp) throw new Error('Dapp not found')

			// ------------------------------ [CODE] ------------------------------
			const code = await this.recoverCodeQuery.getValid({ origin: host, userId: dapp.user_id })

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
			await this.recoverCodeQuery.delete(code.id).catch(error => console.error(error))

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
}

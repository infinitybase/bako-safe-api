import { DatabaseClass } from '../database'
import { BaseQuery } from './base'

interface IGetValidParams {
	origin: string
	userId: string
}

interface ICreateParams extends IGetValidParams {
	code: string
	metadata: string
	network: string
}

export class RecoverCodeQuery extends BaseQuery {
	private static instance: RecoverCodeQuery

	private constructor(database: DatabaseClass) {
		super(database)
	}

	static getInstance(database: DatabaseClass): RecoverCodeQuery {
		if (!RecoverCodeQuery.instance) {
			RecoverCodeQuery.instance = new RecoverCodeQuery(database)
		}

		return RecoverCodeQuery.instance
	}

	async create({ origin, userId, code, metadata, network }: ICreateParams) {
		return await this.database.query(
			`
				INSERT INTO recover_codes (origin, owner, type, code, valid_at, metadata, used, network)
				VALUES ($1, $2, 'AUTH_ONCE', $3, NOW() + INTERVAL '2 minutes', $4, false, $5)
				RETURNING *;
			`,
			[origin, userId, code, metadata, network],
		)
	}

	async getValid({ origin, userId }: IGetValidParams) {
		return await this.database.query(
			`
				SELECT id, code
				FROM recover_codes
				WHERE origin = $1
				AND owner = $2
				AND used = false
				AND valid_at > NOW()
				ORDER BY valid_at DESC
				LIMIT 1;
			`,
			[origin, userId],
		)
	}

	async delete(id: string) {
		return await this.database.query(
			`
				DELETE FROM recover_codes
				WHERE id = $1
			`,
			[id],
		)
	}
}

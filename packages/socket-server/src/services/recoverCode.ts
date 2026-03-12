import { BaseService } from './base'

interface IGetValidParams {
	origin: string
	userId: string
}

interface ICreateParams extends IGetValidParams {
	code: string
	metadata: string
	network: string
	expTime?: string
}

const DEFAULT_EXP_TIME = '3' // minutes

export class RecoverCodeService extends BaseService {
	async create({ origin, userId, code, expTime = DEFAULT_EXP_TIME, metadata, network }: ICreateParams) {
		return await this.database.query(
			`
				INSERT INTO recover_codes (origin, owner, type, code, valid_at, metadata, used, network)
				VALUES ($1, $2, 'AUTH_ONCE', $3,  NOW() + ($4 || ' minutes')::interval, $5, false, $6)
				RETURNING *;
			`,
			[origin, userId, code, expTime, metadata, network],
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

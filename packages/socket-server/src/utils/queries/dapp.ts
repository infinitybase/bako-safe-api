import { DatabaseClass } from '../database'
import { BaseQuery } from './base'

export class DappQuery extends BaseQuery {
	private static instance: DappQuery

	private constructor(database: DatabaseClass) {
		super(database)
	}

	static getInstance(database: DatabaseClass): DappQuery {
		if (!DappQuery.instance) {
			DappQuery.instance = new DappQuery(database)
		}

		return DappQuery.instance
	}

	async getBySessionId(sessionId: string) {
		return await this.database.query(
			`
				SELECT d.*, u.id AS user_id, u.address AS user_address
				FROM dapp d
				JOIN "users" u ON d.user = u.id
				WHERE d.session_id = $1
			`,
			[sessionId],
		)
	}

	async getBySessionIdWithPredicate(sessionId: string) {
		return await this.database.query(
			`
				SELECT 
					d.*,
					u.id AS user_id,
					u.address AS user_address,
					c.id AS current_vault_id,
					c.name AS current_vault_name,
					c.predicate_address AS current_vault_address,
					c.description AS current_vault_description
				FROM dapp d
				JOIN "users" u ON d.user = u.id
				JOIN "predicates" c ON d.current = c.id
				WHERE d.session_id = $1
			`,
			[sessionId],
		)
	}
}

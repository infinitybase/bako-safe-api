import { DatabaseClass } from '../database'
import { BaseQuery } from './base'

export class PredicateQuery extends BaseQuery {
	private static instance: PredicateQuery

	private constructor(database: DatabaseClass) {
		super(database)
	}

	static getInstance(database: DatabaseClass): PredicateQuery {
		if (!PredicateQuery.instance) {
			PredicateQuery.instance = new PredicateQuery(database)
		}

		return PredicateQuery.instance
	}

	async getById(id: string) {
		return await this.database.query(
			`
				SELECT p.*, pv.code AS version_code
				FROM predicates p
				JOIN predicate_versions pv ON p.version_id = pv.id
				WHERE p.id = $1
			`,
			[id],
		)
	}
}

import { BaseService } from './base'

export class PredicateService extends BaseService {
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

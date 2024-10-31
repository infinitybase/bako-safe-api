import { BaseService } from './base'

export class PredicateService extends BaseService {
	async getById(id: string) {
		return await this.database.query(
			`
				SELECT p.*
				FROM predicates p
				WHERE p.id = $1
			`,
			[id],
		)
	}
}

import { DatabaseClass } from '../database'

export class BaseQuery {
	protected database: DatabaseClass

	protected constructor(database: DatabaseClass) {
		this.database = database
	}
}

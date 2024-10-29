import { DatabaseClass } from '../database'

export class BaseQuery {
	protected database: DatabaseClass

	public constructor(database: DatabaseClass) {
		this.database = database
	}
}

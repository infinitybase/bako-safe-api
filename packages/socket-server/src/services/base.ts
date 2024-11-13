import { DatabaseClass } from '../utils/database'

export class BaseService {
	protected database: DatabaseClass

	public constructor(database: DatabaseClass) {
		this.database = database
	}
}

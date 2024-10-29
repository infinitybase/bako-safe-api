import { TransactionStatus } from 'bakosafe'
import { BaseQuery } from './base'
import { DatabaseClass } from '../database'

interface IUpdateSummaryParams {
	hash: string
	summary: string
}

interface ICountPendingParams {
	predicateId: string
	networkUrl: string
}

export class TransactionQuery extends BaseQuery {
	private static instance: TransactionQuery

	private constructor(database: DatabaseClass) {
		super(database)
	}

	static getInstance(database: DatabaseClass): TransactionQuery {
		if (!TransactionQuery.instance) {
			TransactionQuery.instance = new TransactionQuery(database)
		}

		return TransactionQuery.instance
	}

	async updateSummary({ hash, summary }: IUpdateSummaryParams) {
		return await this.database.query(
			`
				UPDATE transactions
				SET summary = $1
				WHERE hash = $2
			`,
			[summary, hash],
		)
	}

	async countPending({ predicateId, networkUrl }: ICountPendingParams) {
		return await this.database.query(
			`
				SELECT COUNT(*)
				FROM transactions t
				WHERE t.predicate_id = $1 
				AND t.status = $2
				AND t.deleted_at IS NULL
				AND regexp_replace(t.network->>'url', '^https?://[^@]+@', 'https://') = $3;
			`,
			[predicateId, TransactionStatus.AWAIT_REQUIREMENTS, networkUrl],
		)
	}
}

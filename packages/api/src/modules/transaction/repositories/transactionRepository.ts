import { Transaction } from "@src/models/Transaction";
import { SelectQueryBuilder } from "typeorm";

export class TransactionRepository {
  constructor(private readonly filter: any) {}

  buildQuery(): SelectQueryBuilder<Transaction> {
    const queryBuilder = Transaction.createQueryBuilder('t')
      .select([
        't.createdAt',
        't.gasUsed',
        't.hash',
        't.id',
        't.name',
        't.predicateId',
        't.txData',
        't.resume',
        't.sendTime',
        't.status',
        't.summary',
        't.updatedAt',
        't.type',
        't.network',
      ])
      .leftJoin('t.predicate', 'predicate')
      .leftJoin('predicate.members', 'members')
      .leftJoin('predicate.workspace', 'workspace')
      .addSelect([
        'predicate.name',
        'predicate.id',
        'predicate.predicateAddress',
        'predicate.configurable',
        'members.id',
        'members.avatar',
        'members.address',
        'workspace.id',
        'workspace.name',
        'workspace.single',
      ])
      .andWhere(
        'regexp_replace(t.network->>\'url\', \'^https?://[^@]+@\', \'https://\') = :network',
        { network: this.filter.network.replace(/^https?:\/\/[^@]+@/, 'https://') }
      )
      .orderBy('t.createdAt', 'DESC');

    if (Array.isArray(this.filter?.predicateId) && this.filter?.predicateId?.length) {
      queryBuilder.andWhere(`t.predicate_id::text IN (:...predicateIds)`, { predicateIds: this.filter?.predicateId });
    }

    if (Array.isArray(this.filter?.status) && this.filter?.status?.length) {
      queryBuilder.andWhere(`t.status::text IN (:...statuses)`, { statuses: this.filter.status });
    }

    if (this.filter?.type) {
      queryBuilder.andWhere(`t.type::text = :type`, { type: this.filter.type });
    }

    return queryBuilder;
  }
}
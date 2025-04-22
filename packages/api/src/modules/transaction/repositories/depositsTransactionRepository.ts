import { DepositTransactions } from "@src/models/DepositTransactions";
import { SelectQueryBuilder } from "typeorm";

export class DepositsTransactionRepository {
  constructor(private readonly filter: any) {}

  buildQuery(): SelectQueryBuilder<DepositTransactions> {
    const queryBuilder = DepositTransactions.createQueryBuilder('dt')
      .select([
        'dt.createdAt',
        'dt.gasUsed',
        'dt.hash',
        'dt.id',
        'COALESCE(NULL::text, \'Deposit\') AS name',
        'dt.predicateId',
        'NULL::jsonb as txData',
        'dt.resume',
        'dt.sendTime',
        'dt.status',
        'dt.summary',
        'dt.updatedAt',
        'dt.type',
        'dt.network',
      ])
      .leftJoin('dt.predicate', 'predicate')
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
        'regexp_replace(dt.network->>\'url\', \'^https?://[^@]+@\', \'https://\') = :network',
        { network: this.filter.network.replace(/^https?:\/\/[^@]+@/, 'https://') }
      )
      .orderBy('dt.createdAt', 'DESC');

    if (Array.isArray(this.filter?.predicateId) && this.filter?.predicateId?.length) {
      queryBuilder.andWhere(`dt.predicate_id::text IN (:...predicateIds)`, { predicateIds: this.filter?.predicateId });
    }

    if (Array.isArray(this.filter?.status) && this.filter?.status?.length) {
      queryBuilder.andWhere(`dt.status::text IN (:...statuses)`, { statuses: this.filter.status });
    }

    if (this.filter?.type) {
      queryBuilder.andWhere(`dt.type::text = :type`, { type: this.filter.type });
    }

    return queryBuilder;
  }
}
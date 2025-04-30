import { PsqlClient } from "@/clients";

export class PredicateRepository {
  constructor(private readonly client: PsqlClient) {}

  async listPredicates() {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.predicate_address,
        p.configurable,
        p.owner_id,
        ut.user_id AS token_user_id,
        ut.token,
        COALESCE(pm.members, '[]') AS members
      FROM predicates p
      LEFT JOIN user_tokens ut ON p.owner_id = ut.user_id
      LEFT JOIN (
        SELECT 
          predicate_id,
          json_agg(
            jsonb_build_object(
              'predicate_id', predicate_id,
              'user_id', user_id
            )
          ) AS members
        FROM predicate_members
        GROUP BY predicate_id
      ) pm ON p.id = pm.predicate_id;
    `;

    const result = await this.client.query(query);

    return result;
  }
}
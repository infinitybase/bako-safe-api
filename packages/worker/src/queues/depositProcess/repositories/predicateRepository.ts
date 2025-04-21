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
        ut.token
      FROM predicates p
      LEFT JOIN user_tokens ut ON p.owner_id = ut.user_id;
    `;

    const result = await this.client.query(query);

    return result;
  }
}
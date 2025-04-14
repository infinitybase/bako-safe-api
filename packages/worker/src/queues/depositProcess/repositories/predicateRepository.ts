import { PsqlClient } from "@/clients";

export class PredicateRepository {
  constructor(private readonly client: PsqlClient) {}

  async listPredicates() {
    const query = `
      SELECT 
        p.id,
        p.predicate_address,
        p.owner_id,
        ut.user_id AS token_user_id,
        ut.token
      FROM predicates p
      LEFT JOIN user_tokens ut ON p.owner_id = ut.user_id;
    `;

    const result = await this.client.query(query);

    return result;
  }

  async setPredicateLastUpdated(predicate_id: string) {
    if (!this.client) {
      throw new Error("Client not initialized. Call init() first.");
    }
    
    
  }
}
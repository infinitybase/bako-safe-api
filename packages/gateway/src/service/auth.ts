import { Vault } from 'bakosafe';
import { Address } from 'fuels';

import { Database } from '@/lib';

type GetApiToken = {
  apiToken: string;
  userId: string;
}

type GetVault = {
  code: string;
  vaultId: string,
  userAddress: string;
}

export class AuthService {
  constructor(private db: Database) {}

  static async instance() {
    return new AuthService(await Database.connect());
  }

  async getVaultFromApiToken(apiToken: string, userId: string) {
    const { vaultId, provider, userAddress } = await this.getTokenData({ apiToken, userId });
    const code = await this.createSession(userId);
    return this.getVault({ code, vaultId, userAddress });
  }

  async getVault(params: GetVault) {
    return Vault.create({
      id: params.vaultId,
      address: params.userAddress,
      token: params.code,
    });
  }

  async getTokenData(params: GetApiToken) {
    const { apiToken, userId } = params;

    const query = `
      SELECT api_tokens.predicate_id,
             users.address,
             predicates.provider
      FROM api_tokens
               INNER JOIN predicates ON api_tokens.predicate_id = predicates.id
               INNER JOIN predicate_members ON api_tokens.predicate_id = predicate_members.predicate_id
               INNER JOIN workspace_users ON workspace_users.workspace_id = predicates.workspace_id
               INNER JOIN users ON workspace_users.user_id = users.id
      WHERE api_tokens.token = $1
        AND api_tokens.deleted_at IS null
        AND (predicate_members.user_id = $2 OR
             workspace_users.user_id = $2)
      LIMIT 1;
       `;

    const result = await this.db.query(query, [apiToken, userId]);

    if (!result || !result.predicate_id) {
      throw new Error('Invalid token');
    }

    return {
      vaultId: result.predicate_id,
      provider: result.provider,
      userAddress: result.address,
    };
  }

  async createSession(user: string) {
    const code = `cli${Address.fromRandom().toB256()}`;
    const query = `
      INSERT INTO recover_codes(origin, type, owner, code, used, valid_at, metadata)
      VALUES ($1, 'AUTH_ONCE', $2, $3, false, now(), $4)
    `;
    await this.db.query(query, ['CLI', user, code, JSON.stringify({ uses: 0 })]);
    return code;
  }
}
import { Address, bufferFromString, sha256 } from "fuels";

import { Database } from "@/lib";
import { BakoProvider, Vault } from "bakosafe";

type GetApiToken = {
  apiToken: string;
  userId: string;
};

type TokenData = {
  userAddress: string;
  tokenConfig: string;
  predicate: {
    id: string;
    address: string;
    network: {
      url: string;
      chainId: number;
    };
  };
};

export class AuthService {
  private static tokenCache: Record<string, TokenData> = {};

  constructor(private db: Database) {}

  async getSession(apiToken: string, userId: string) {
    const { tokenConfig, userAddress, predicate } = await this.getTokenData({
      apiToken,
      userId,
    });
    const { code, codeId } = await this.createSession(
      userId,
      predicate.network
    );

    const bakoProvider = await BakoProvider.create(predicate.network.url, {
      token: code,
      address: userAddress,
      serverApi: process.env.API_URL!,
    });

    const vault = await Vault.fromAddress(predicate.address, bakoProvider);

    return {
      vault,
      provider: bakoProvider,
      userAddress,
      tokenConfig,
      code: {
        value: code,
        id: codeId,
      },
    };
  }

  async getTokenData(params: GetApiToken) {
    const { apiToken, userId } = params;

    const cacheKey = `${apiToken}-${userId}`;
    if (AuthService.tokenCache[cacheKey]) {
      return AuthService.tokenCache[cacheKey];
    }

    const query = `
      SELECT api_tokens.predicate_id,
             api_tokens.network,
             api_tokens.config,
             users.address,
             predicates.predicate_address
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
      throw new Error("Invalid token");
    }

    const tokenData = {
      userAddress: result.address,
      tokenConfig: result.config,
      predicate: {
        id: result.predicate_id,
        address: result.predicate_address,
        network: result.network,
      },
    };

    AuthService.tokenCache[cacheKey] = tokenData;

    return tokenData;
  }

  async createSession(
    user: string,
    network: TokenData["predicate"]["network"]
  ) {
    const code = `cli${Address.fromRandom().toB256()}`;
    const query = `
      INSERT INTO recover_codes(origin, type, owner, code, used, valid_at, metadata, network)
      VALUES ('CLI', 'AUTH_ONCE', $1, $2, false, NOW() + INTERVAL '2 minutes', $3, $4)
      RETURNING id;
    `;
    const result = await this.db.query(query, [
      user,
      code,
      JSON.stringify({ uses: 0 }),
      JSON.stringify(network),
    ]);
    return { code, codeId: result.id };
  }

  async closeSession(id: string) {
    const query = `
      UPDATE recover_codes
      SET used = true
      WHERE id = $1 AND used = false
    `;
    await this.db.query(query, [id]);
  }

  get database() {
    return this.db;
  }
}

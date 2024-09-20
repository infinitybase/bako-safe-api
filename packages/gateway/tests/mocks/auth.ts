import { AuthService, GetApiToken } from "@/service";
import { Database, defaultConnection } from "@/lib";
import { BakoProvider, Vault } from "bakosafe";
import { Address, randomUUID } from "fuels";
import { Client, ConnectionConfig } from "pg";
import { query } from "express";

export class DatabaseMock extends Database {
  constructor() {
    super(new Client());
  }

  async query(query: string, params?: string[]): Promise<any> {
    return {};
  }
}

// export class AuthServiceMock extends AuthService {
//   private sessions: Map<string, { user: string; id: string }> = new Map();
//   private tokenData: Map<
//     string,
//     {
//       tokenConfig: string;
//       userAddress: string;
//       predicate: { provider: string; address: string };
//     }
//   > = new Map();
//
//   constructor() {
//     super(new DatabaseMock());
//   }
//
//   async getSession(apiToken: string, userId: string) {
//     const { tokenConfig, userAddress, predicate } = await this.getTokenData({
//       apiToken,
//       userId,
//     });
//     const { code, codeId } = await this.createSession(userId);
//
//     const bakoProvider = await BakoProvider.create(predicate.provider, {
//       address: userAddress,
//       token: code,
//     });
//
//     const vault = await Vault.fromAddress(predicate.address, bakoProvider);
//
//     return {
//       vault,
//       provider: bakoProvider,
//       userAddress,
//       tokenConfig,
//       code: {
//         value: code,
//         id: codeId,
//       },
//     };
//   }
//
//   async getTokenData(params: GetApiToken) {
//     const { apiToken, userId } = params;
//
//     const query = `
//       SELECT api_tokens.predicate_id,
//              users.address,
//              predicates.provider,
//              predicates.predicate_address,
//              api_tokens.config
//       FROM api_tokens
//                INNER JOIN predicates ON api_tokens.predicate_id = predicates.id
//                INNER JOIN predicate_members ON api_tokens.predicate_id = predicate_members.predicate_id
//                INNER JOIN workspace_users ON workspace_users.workspace_id = predicates.workspace_id
//                INNER JOIN users ON workspace_users.user_id = users.id
//       WHERE api_tokens.token = $1
//         AND api_tokens.deleted_at IS null
//         AND (predicate_members.user_id = $2 OR
//              workspace_users.user_id = $2)
//       LIMIT 1;
//        `;
//
//     const result = await this.db.query(query, [apiToken, userId]);
//
//     if (!result || !result.predicate_id) {
//       throw new Error("Invalid token");
//     }
//
//     return {
//       userAddress: result.address,
//       tokenConfig: result.config,
//       predicate: {
//         id: result.predicate_id,
//         address: result.predicate_address,
//         provider: result.provider,
//       },
//     };
//   }
//
//   async createSession(user: string) {
//     const code = `cli${Address.fromRandom().toB256()}`;
//     const payload = {
//       user,
//       id: randomUUID(),
//     };
//     this.sessions.set(code, payload);
//     return { code, codeId: payload.id };
//   }
//
//   async closeSession(id: string) {
//     this.sessions.delete(id);
//   }
// }

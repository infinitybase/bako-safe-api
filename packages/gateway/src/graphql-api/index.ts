import { createGraphqlFetch } from "@/lib";

import { executableSchema, defaultSchema } from "./schema";
import { resolvers } from "./resolvers";

const httpExecutor = createGraphqlFetch();

// Schema for overrides subscriptions
export const subscriptionSchema = defaultSchema({
  resolvers,
});

// Schema for overrides mutations and queries
export const defaultSchemas = executableSchema(httpExecutor, { resolvers });

import { createGraphqlFetch } from "@/lib";
import { defaultSchema, executableSchema } from "./schema";
import { resolvers } from "./resolvers";

const httpExecutor = createGraphqlFetch();

export const appSchema = defaultSchema({
  resolvers,
});

export const fuelSchema = executableSchema(httpExecutor, {
  resolvers,
});

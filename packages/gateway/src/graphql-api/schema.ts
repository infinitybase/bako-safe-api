import { makeExecutableSchema, mergeSchemas } from '@graphql-tools/schema';
import { IExecutableSchemaDefinition } from "@graphql-tools/schema/typings/types";
import { wrapSchema } from "@graphql-tools/wrap";
import { AsyncExecutor, Executor, TypeSource } from '@graphql-tools/utils';
import { typeDefs } from '@/generated';
import { SubschemaConfig } from '@graphql-tools/delegate';

interface CreateSchemaParams extends SubschemaConfig {
  executor?: Executor;
}

function createSchema({ executor, ...params }: CreateSchemaParams) {
  const wrappedSchema = wrapSchema({
    executor,
    ...params,
  });

  return wrappedSchema;
}

export function executableSchema<F extends Executor<any>>(executor: F, options?: Omit<IExecutableSchemaDefinition, "typeDefs">) {
  const fuelSchema = createSchema({
    schema: makeExecutableSchema({
      typeDefs,
    }),
    executor,
  });

  const appSchema = mergeSchemas({
    schemas: [fuelSchema],
    resolvers: options.resolvers,
  });

  return { appSchema, fuelSchema };
}

export const defaultSchema = (
  options?: Omit<IExecutableSchemaDefinition, "typeDefs">
) => {
  const schema = makeExecutableSchema({
    typeDefs,
    ...options,
  });

  return schema;
};

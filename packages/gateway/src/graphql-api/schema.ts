import { makeExecutableSchema } from "@graphql-tools/schema";
import { IExecutableSchemaDefinition } from "@graphql-tools/schema/typings/types";
import { wrapSchema } from "@graphql-tools/wrap";
import { AsyncExecutor } from '@graphql-tools/utils';
import { typeDefs } from '@/generated';

export const defaultSchema = (
  options?: Omit<IExecutableSchemaDefinition, "typeDefs">
) => {
  const schema = makeExecutableSchema({
    typeDefs,
    ...options,
  });

  return schema;
};

export const executableSchema = (
  executor: AsyncExecutor,
  options?: Omit<IExecutableSchemaDefinition, "typeDefs">
) => {
  const schema = defaultSchema(options);

  return wrapSchema({
    schema,
    executor,
  });
};

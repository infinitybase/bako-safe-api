import type { AsyncExecutor } from '@graphql-tools/utils';
import { print } from 'graphql';

const { FUEL_PROVIDER } = process.env;

const httpExecutor: AsyncExecutor = async (params) => {
  const { document, variables, operationName, extensions } = params;
  const query = print(document);
  const fetchResult = await fetch(
    FUEL_PROVIDER,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables, operationName, extensions }),
    },
  );

  return fetchResult.json();
};

export const createExecutor: AsyncExecutor = async (executorRequest) => {
  return httpExecutor(executorRequest);
};

export const createGraphqlFetch: () => AsyncExecutor = () => {
  return (request) => createExecutor(request);
};

import type { AsyncExecutor } from '@graphql-tools/utils';
import { print } from 'graphql';
import express from 'express';
import { createHandler as createHttpHandler } from 'graphql-http/lib/use/express';

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

export const createGraphqlHttpHandler = ({ appSchema, fuelSchema }) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const handler = createHttpHandler({
      schema: appSchema,
      // @ts-ignore
      context: { ...req.context, schema: fuelSchema },
    });

    return handler(req, res, next);
  }
}

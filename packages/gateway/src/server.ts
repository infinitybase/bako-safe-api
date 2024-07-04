import express from "express";
import cors from "cors";
import { Server } from "http";

import { defaultSchemas, subscriptionSchema } from "@/graphql-api";
import { createGraphqlHttpHandler, createSubscriptionHandler } from "@/lib";
import { handleErrorMiddleware, tokenDecodeMiddleware } from "@/middlewares";

const {
  APP_NAME
} = process.env;

export class GatewayServer {
  private static ROUTES_PATHS = {
    graphql: "/gateway/v1/graphql",
    graphqlSub: "/gateway/v1/graphql-sub",
    healthCheck: "/gateway/v1/health-check",
  };

  private readonly app: express.Application;
  private readonly port: number;
  private server: Server;

  constructor(port: number | string) {
    this.port = Number(port);
    this.app = express();
  }

  start() {
    this.beforeAllMiddlewares();
    this.routes();
    this.afterAllMiddlewares();
    this.server = this.app.listen(this.port, () => {
      console.log(
        `[GATEWAY_SERVER] Listening on http://localhost:${this.port}`
      );
      console.log(
        `- GraphQL: http://localhost:${this.port}${GatewayServer.ROUTES_PATHS.graphql}`
      );
      console.log(
        `- GraphQL Subscriptions: http://localhost:${this.port}${GatewayServer.ROUTES_PATHS.graphqlSub}`
      );
    });
  }

  stop() {
    this.server.close();
  }

  private beforeAllMiddlewares() {
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use((req, res, next) => {
      console.log(`[${APP_NAME}] ${req.method} ${req.url}`);
      next();
    })
  }

  private afterAllMiddlewares() {
    this.app.use(handleErrorMiddleware);
  }

  private routes() {
    this.app.post(
      GatewayServer.ROUTES_PATHS.graphqlSub,
      tokenDecodeMiddleware,
      createSubscriptionHandler({ schema: subscriptionSchema })
    );
    this.app.post(
      GatewayServer.ROUTES_PATHS.graphql,
      tokenDecodeMiddleware,
      createGraphqlHttpHandler({
        appSchema: defaultSchemas.appSchema,
        fuelSchema: defaultSchemas.fuelSchema,
      })
    );
    this.app.get('/gateway/ping', ({ res }) => res.status(200).send(
      {
        message: `${APP_NAME} is running - ${new Date().toISOString()}`,
      }
    ));
    this.app.get(GatewayServer.ROUTES_PATHS.healthCheck, ({ res }) =>
      res.status(200).send({ status: "ok" })
    );
  }
}

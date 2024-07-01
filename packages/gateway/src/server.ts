import express from "express";
import cors from "cors";
import { Server } from "http";
import { createHandler as createHttpHandler } from "graphql-http/lib/use/express";
import expressPlayground from "graphql-playground-middleware-express";
import { createSubscriptionHandler } from "@/lib/subscription";
import { appSchema, fuelSchema } from "@/graphql-api";

export class GatewayServer {
  private static ROUTES_PATHS = {
    graphql: "/v1/graphql",
    graphqlSub: "/v1/graphql-sub",
  };

  private readonly app: express.Application;
  private readonly port: number;
  private server: Server;

  constructor(port: number | string) {
    this.port = Number(port);
    this.app = express();
  }

  start() {
    this.middlewares();
    this.routes();
    this.server = this.app.listen(this.port, () => {
      console.log(`[GATEWAY_SERVER] Listening on http://localhost:${this.port}`);
      console.log(`- GraphQL Playground: http://localhost:${this.port}${GatewayServer.ROUTES_PATHS.graphql}`);
      console.log(`- GraphQL: http://localhost:${this.port}${GatewayServer.ROUTES_PATHS.graphql}`);
      console.log(`- GraphQL Subscriptions: http://localhost:${this.port}${GatewayServer.ROUTES_PATHS.graphqlSub}`);
    });
  }

  stop() {
    this.server.close();
  }

  private middlewares() {
    this.app.use(express.json());
    this.app.use(cors());
  }

  private routes() {
    this.app.get(
      GatewayServer.ROUTES_PATHS.graphql,
      expressPlayground({
        endpoint: GatewayServer.ROUTES_PATHS.graphql,
        subscriptionEndpoint: GatewayServer.ROUTES_PATHS.graphqlSub,
        settings: {
          "schema.polling.enable": false,
        },
      })
    );

    this.app.post(
      GatewayServer.ROUTES_PATHS.graphqlSub,
      createSubscriptionHandler({ schema: appSchema })
    );
    this.app.post(GatewayServer.ROUTES_PATHS.graphql, (req, res, next) => {
      const handler = createHttpHandler({
        schema: fuelSchema,
        // @ts-ignore
        context: req.context,
      });

      return handler(req, res, next);
    });
  }
}

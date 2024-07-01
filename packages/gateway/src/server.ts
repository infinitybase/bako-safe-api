import express from "express";
import cors from "cors";
import { Server } from "http";

export class GatewayServer {
  private readonly app: express.Application;
  private readonly port: number;
  private server: Server;

  constructor(port: number | string) {
    this.port = Number(port);
    this.app = express();
  }

  start() {
    this.routes();
    this.app.use(express.json());
    this.app.use(cors());
    this.server = this.app.listen(this.port, () => {
      console.log(`Server listening listening on http://localhost:${this.port}`);
    });
  }

  stop() {
    this.server.close();
  }

  private routes() {
    this.app.use("/graphql", (req, res) => {});
    this.app.use("/graphql-sub", (req, res) => {});
  }
}

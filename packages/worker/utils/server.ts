import http from "node:http";

export class HealthCheckServer {
  private static instance: http.Server | null = null;

  private constructor() {}

  public static getInstance(): http.Server {
    if (!HealthCheckServer.instance) {
      const PORT = process.env.HEALTHCHECK_PORT || 8080;

      HealthCheckServer.instance = http
        .createServer((req, res) => {
          if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("OK");
          } else {
            res.writeHead(404);
            res.end();
          }
        })
        .listen(PORT, () => {
          console.log(`Healthcheck server running on port ${PORT}`);
        });
    }

    return HealthCheckServer.instance;
  }
}

// export const healthCheckServer = HealthCheckServer.getInstance();

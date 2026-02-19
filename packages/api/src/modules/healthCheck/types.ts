export interface IHealthCheckResponse {
  status: 'ok';
}

export interface IHealthCheckService {
  checkDatabase(): Promise<IHealthCheckResponse>;
  checkRedis(): Promise<IHealthCheckResponse>;
}

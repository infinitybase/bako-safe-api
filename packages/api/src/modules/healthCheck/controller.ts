import { bindMethods, Responses, successful } from '@src/utils';
import { error } from '@src/utils/error';
import { IHealthCheckService } from './types';

export class HealthCheckController {
  private healthCheckService: IHealthCheckService;

  constructor(healthCheckService: IHealthCheckService) {
    this.healthCheckService = healthCheckService;
    bindMethods(this);
  }

  async checkDatabase() {
    try {
      const result = await this.healthCheckService.checkDatabase();
      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async checkRedis() {
    try {
      const result = await this.healthCheckService.checkRedis();
      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

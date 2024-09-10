import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';
import { IPointsService, ScoreRequest } from './types';

export class PointsController {
  private pointsService: IPointsService;

  constructor(pointsService: IPointsService) {
    Object.assign(this, { pointsService });
    bindMethods(this);
  }

  async score({ user }: ScoreRequest) {
    try {
      const userScore = await this.pointsService.getScore(user.id, true);

      return successful(userScore, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}

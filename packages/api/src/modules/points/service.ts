import { ErrorTypes, Internal } from '@src/utils/error';
import { CompletedTask, CreatePointsParams, IPointService } from './types';

export class PointService implements IPointService {
  // TODO: Convert to a dynamodb table
  completedTasks: CompletedTask[] = [];

  async create({ userId, task }: CreatePointsParams): Promise<CompletedTask> {
    try {
      // TODO: Replace with dynamo query
      const alreadyCompleted = this.completedTasks.find(
        ({ task, userId }) => task === task && userId === userId,
      );

      if (alreadyCompleted) return;

      const completed: CompletedTask = {
        userId,
        task,
        date: new Date(),
      };

      // TODO: Replace with dynamo mutation
      this.completedTasks.push(completed);

      return completed;
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on user find',
        detail: error,
      });
    }
  }
}

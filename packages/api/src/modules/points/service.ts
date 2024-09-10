import { ErrorTypes, Internal } from '@src/utils/error';
import {
  CompletedTask,
  CompleteTaskParams,
  IPointService,
  taskList,
} from './types';

export class PointService implements IPointService {
  // TODO: Convert to a dynamodb table
  completedTasks: CompletedTask[] = [];

  async completeTask({
    userId,
    taskId,
  }: CompleteTaskParams): Promise<CompletedTask> {
    try {
      // TODO: Replace with dynamo query
      const alreadyCompleted = this.completedTasks.find(
        completed => completed.taskId === taskId && completed.userId === userId,
      );

      if (alreadyCompleted) return;

      const completed: CompletedTask = {
        userId,
        taskId,
        date: new Date(),
      };

      // TODO: Replace with dynamo mutation
      this.completedTasks.push(completed);

      return completed;
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error creating completed task',
        detail: error,
      });
    }
  }

  async findUserTasks(userId: string): Promise<CompletedTask[]> {
    try {
      // TODO: Replace with dynamo query
      return this.completedTasks.filter(
        completedTask => completedTask.userId === userId,
      );
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error finding completed tasks',
        detail: error,
      });
    }
  }

  async getUserScore(userId: string): Promise<number> {
    try {
      const completedTasks = await this.findUserTasks(userId);

      const score = completedTasks.reduce((acc, completedTask) => {
        const task = taskList.find(task => task.id === completedTask.taskId);

        return acc + task.points;
      }, 0);

      return score;
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error calculating user score',
        detail: error,
      });
    }
  }
}

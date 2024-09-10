import { ErrorTypes, Internal } from '@src/utils/error';
import {
  CompletedTask,
  CompleteTaskParams,
  IPointsService,
  TaskId,
  UserScore,
} from './types';
import { taskList } from './data';

export class PointsService implements IPointsService {
  // TODO: Convert to a dynamodb table
  completedTasks: CompletedTask[] = [
    {
      userId: '0d26df9e-f579-4e29-ba60-248f1a35c696',
      taskId: TaskId.REGULAR_ACCOUNT,
      date: new Date('2024-09-10T18:35:11.822Z'),
    },
  ];

  async completeTask({
    userId,
    taskId,
  }: CompleteTaskParams): Promise<CompletedTask> {
    try {
      // TODO: Replace with dynamo query
      const alreadyCompleted = await this.completedTasks.find(
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

      console.log('🚀 ~ PointsService ~ this.completedTasks:', this.completedTasks);

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

  async getScore(userId: string, includeTasks = false): Promise<UserScore> {
    try {
      const completedTasks = await this.findUserTasks(userId);

      const score = completedTasks.reduce((acc, completedTask) => {
        // TODO: Improve this
        const task = taskList.find(task => task.id === completedTask.taskId);

        return acc + task.points;
      }, 0);

      return { score, ...(includeTasks ? completedTasks : {}) };
    } catch (error) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error calculating user score',
        detail: error,
      });
    }
  }
}

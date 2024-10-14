import { Request } from 'express';
import { PointsService } from './service';
import { bindMethods, successful, Responses } from '@src/utils';
import { error } from '@utils/error';

export class PointsController {
  private pointsService: PointsService;

  constructor(pointsService: PointsService) {
    this.pointsService = pointsService;
    bindMethods(this);
  }

  async getSimpleTransaction(req: Request) {
    const { data, address } = req.params;

    try {
      const result = await this.pointsService.getSimpleTransaction(data, address);
      return successful({ valid: result }, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getMultisigTransaction(req: Request) {
    const { data, address } = req.params;

    try {
      const result = await this.pointsService.getMultisigTransaction(data, address);
      return successful({ valid: result }, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getUserAddressAndType(req: Request) {
    const { predicateAddress } = req.params;

    try {
      const result = await this.pointsService.getUserAddressAndType(
        predicateAddress,
      );
      return successful(result[0], Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }
}

import { IAuthRequest } from '@src/middlewares/auth/types';
import error from '@src/utils/error';
import successful, { Responses } from '@src/utils/successful';

export class MeController {
  async retrieveMe(req: IAuthRequest) {
    try {
      return successful(
        {
          user: req.user,
        },
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}

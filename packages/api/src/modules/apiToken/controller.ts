import { Request } from 'express';
import { bindMethods, Responses, successful } from '@src/utils';
import {
  IAPITokenService,
  ICLIAuthRequest,
  ICreateAPITokenRequest,
} from '@modules/apiToken/types';
import { IPredicateService } from '@modules/predicate/types';
import {
  error,
  ErrorTypes,
  NotFound,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@utils/error';
import { APIToken, RecoverCode, RecoverCodeType, User } from '@src/models';
import { getRandomB256 } from 'fuels';
import { addMinutes } from 'date-fns';

export class APITokenController {
  constructor(
    private apiTokenService: IAPITokenService,
    private predicateService: IPredicateService,
  ) {
    bindMethods(this);
  }

  async create(req: ICreateAPITokenRequest) {
    const { user, body, params, network } = req;

    const { name, config } = body;
    const { predicateId } = params;

    try {
      const predicate = await this.predicateService.findById(predicateId);

      if (!predicate) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with id ${predicateId} not found`,
        });
      }

      const apiToken = await this.apiTokenService.create({
        name,
        config,
        predicate,
        network,
      });
      const cliToken = this.apiTokenService.generateCLIToken(
        apiToken.token,
        user.id,
      );

      return successful(
        {
          id: apiToken.id,
          name: apiToken.name,
          token: cliToken,
          config: apiToken.config,
          network: apiToken.network,
        },
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async list(req: Request) {
    const { params } = req;
    const { predicateId } = params;

    try {
      const tokens = await this.apiTokenService.list({ predicateId });
      return successful(tokens, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async delete(req: Request) {
    const { params } = req;
    const { predicateId, id } = params;

    try {
      await this.apiTokenService.delete({ id, predicateId });
      return successful(null, Responses.Created);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async auth(req: ICLIAuthRequest) {
    const { body } = req;
    const { token, network } = body;

    try {
      const cliToken = this.apiTokenService.decodeCLIToken(token);
      const apiToken = await APIToken.findOne({
        where: {
          token: cliToken.apiToken,
        },
        relations: ['predicate'],
      });

      if (!apiToken) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_CREDENTIALS,
          detail: 'Some required credentials are missing',
        });
      }

      const recoverCode = await RecoverCode.create({
        type: RecoverCodeType.AUTH_ONCE,
        code: `cli${getRandomB256()}`,
        owner: { id: cliToken.userId },
        validAt: addMinutes(new Date(), 5),
        origin: 'cli',
        metadata: { uses: 0 },
        network,
      }).save();
      const user = await User.findOne({
        where: { id: cliToken.userId },
        select: ['address'],
      });
      return successful(
        {
          code: recoverCode.code,
          address: user.address,
          version: apiToken.predicate.version,
          configurable: JSON.parse(apiToken.predicate.configurable),
          tokenConfig: apiToken.config,
        },
        Responses.Ok,
      );
    } catch (e) {
      let err = e;

      if (err instanceof Error) {
        err = new Unauthorized({
          type: ErrorTypes.Internal,
          title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
          detail: e.message,
        });
      }

      return error(err, err.statusCode);
    }
  }
}

import crypto from 'crypto';
import { IAPITokenService, IDeleteAPITokenPayload } from '@modules/apiToken/types';
import { APIToken } from '@src/models';
import Internal from '../../utils/error/Internal';
import { ErrorTypes } from '@utils/error';

const { API_TOKEN_SECRET, API_TOKEN_SECRET_IV } = process.env;

const SECRET_KEY = crypto
  .createHash('sha512')
  .update(API_TOKEN_SECRET)
  .digest('hex')
  .substring(0, 32);

const SECRET_IV = crypto
  .createHash('sha512')
  .update(API_TOKEN_SECRET_IV)
  .digest('hex')
  .substring(0, 16);

export class APITokenService implements IAPITokenService {
  async create(payload: Partial<APIToken>) {
    try {
      const token = crypto.randomBytes(16).toString('hex');
      const apiToken = APIToken.create({
        token,
        name: payload.name,
        config: payload.config,
        predicate: payload.predicate,
      });
      return apiToken.save();
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on create API Token',
        detail: e,
      });
    }
  }

  async delete(payload: IDeleteAPITokenPayload) {
    try {
      await APIToken.update(
        {
          id: payload.id,
          predicate: { id: payload.predicateId },
        },
        { deletedAt: new Date() },
      );
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on delete API Token',
        detail: e,
      });
    }
  }

  generateUserToken(apiToken: string, userId: string) {
    const userToken = `${apiToken}.${userId}`;
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(SECRET_KEY),
      Buffer.from(SECRET_IV),
    );
    let encrypted = cipher.update(userToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
}

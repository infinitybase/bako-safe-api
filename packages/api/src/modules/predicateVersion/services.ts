import { PredicateVersion } from '@src/models';
import { IPredicateVersionService } from './types';
import Internal from '@src/utils/error/Internal';
import { ErrorTypes, NotFound } from '@src/utils/error';
import GeneralError from '@src/utils/error/GeneralError';

export class PredicateVersionService implements IPredicateVersionService {
  async findCurrentVersion(): Promise<PredicateVersion> {
    return await PredicateVersion.findOne({
      order: {
        createdAt: 'DESC',
      },
    })
      .then(predicateVersion => {
        if (!predicateVersion) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Predicate version not found',
            detail: `No predicate version was found.`,
          });
        }

        return predicateVersion;
      })
      .catch(e => {
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on predicate findCurrentVersion',
          detail: e,
        });
      });
  }
}

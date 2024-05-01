import { PredicateVersion } from '@src/models';
import { predicateVersions } from '../predicateVersion';

export const generateInitialPredicateVersion = async (): Promise<
  Partial<PredicateVersion>
> => {
  return predicateVersions[0];
};

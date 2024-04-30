import { PredicateVersion } from '@src/models';
import { predicateVersion } from '../predicateVersion';

export const generateInitialPredicateVersion = async (): Promise<
  Partial<PredicateVersion>
> => {
  return predicateVersion;
};

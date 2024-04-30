import { PredicateVersion } from '@src/models';

export interface IPredicateVersionService {
  findCurrentVersion: () => Promise<PredicateVersion>;
}

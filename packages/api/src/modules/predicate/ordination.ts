import { Predicate } from '@src/models';
import { IDefaultOrdination, IOrdination, Sort } from '@src/utils/ordination';

export interface IPredicateOrdination extends IOrdination<Predicate> {
  orderByRoot?: string;
}

export const setOrdination = (order: IPredicateOrdination) => {
  const _order: IPredicateOrdination = {
    orderBy: order?.orderBy ?? IDefaultOrdination.UPDATED_AT,
    sort: order?.sort ?? Sort.DESC,
    orderByRoot: order?.orderByRoot ?? 'false',
  };

  return _order;
};

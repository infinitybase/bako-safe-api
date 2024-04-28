export enum IDefaultOrdination {
  UPDATED_AT = 'updatedAt',
  CREATED_AT = 'createdAt',
}

export enum Sort {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface IOrdination<T> {
  orderBy?: keyof T | IDefaultOrdination;
  sort?: 'DESC' | 'ASC';
}

export const setOrdination = <T>(order: IOrdination<T>) => {
  const _order: IOrdination<T> = {
    orderBy: order?.orderBy ?? IDefaultOrdination.UPDATED_AT,
    sort: order?.sort ?? Sort.DESC,
  };

  return _order;
};

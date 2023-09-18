export interface IOrdination<T> {
  orderBy?: keyof T;
  sort?: 'DESC' | 'ASC';
}

export const setOrdination = <T>(order: IOrdination<T>) => {
  console.log('->> order: ', order);
  const _order: IOrdination<T> = {
    orderBy: order?.orderBy ?? ('updatedAt' as keyof T),
    sort: order?.sort ?? 'DESC',
  };

  return _order;
};

export interface IPredicateService<T> {
  listPredicates(): Promise<T>
  getLastUpdatedPredicate(predicateId: string): Promise<Date | null>
  setLastUpdatedPredicate(predicateId: string, date: Date): Promise<void>
}
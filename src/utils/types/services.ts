export interface IService<Model> {
  create<R>(model: Model): Promise<R>;
  find<R>(): Promise<R[]>;
  findOne<R>(id: number): Promise<R>;
  update<R>(id: number, model: Model): Promise<R>;
  delete(id: number): Promise<boolean>;
}

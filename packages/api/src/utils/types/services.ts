export interface IService<Model> {
  create<R>(model: Model): Promise<R>;
  find<R>(): Promise<R[]>;
  findOne<R>(id: string): Promise<R>;
  update<R>(id: string, model: Model): Promise<R>;
  delete(id: string): Promise<boolean>;
}

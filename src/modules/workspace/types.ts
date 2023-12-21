import { Workspace } from '@src/models/Workspace';
import { IOrdination } from '@src/utils/ordination';
import { PaginationParams, IPagination } from '@src/utils/pagination';

export interface IFilterParams {
  q?: string;
  user?: string;
  single?: boolean;
  owner?: string;
  id?: string;
}

export interface IWorkspacePayload {
  name: string;
  members: string[];
  description?: string;
  avatar?: string;
  single?: boolean;
}

export interface IWorkspaceService {
  ordination(ordination?: IOrdination<Workspace>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IFilterParams): this;

  create: (payload: Partial<Partial<Workspace>>) => Promise<Workspace>;
  //update: (id: string, payload: IUpdatePayload) => Promise<Workspace>;
  list: () => Promise<IPagination<Workspace> | Workspace[]>;
  //   findById: (id: string) => Promise<Workspace>;
}

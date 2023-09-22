import { Asset } from '@src/models';

export interface ICreateAssetPayload {
  assetId: string;
  to: string;
  amount: string;
  transactionID: string;
}

export interface IUpdateAssetPayload {
  assetId?: string;
  to?: string;
  amount?: string;
  transactionID?: string;
}

export interface IAssetService {
  create: (payload: ICreateAssetPayload) => Promise<Asset>;
  update: (id: string, payload: IUpdateAssetPayload) => Promise<Asset>;
  findById: (id: string) => Promise<Asset>;
  list: () => Promise<Asset[]>;
}

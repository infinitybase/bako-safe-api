import { Asset } from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import { IAssetService, ICreateAssetPayload, IUpdateAssetPayload } from './types';

export class AssetService implements IAssetService {
  async create(payload: ICreateAssetPayload): Promise<Asset> {
    return await Asset.create(payload)
      .save()
      .then(assets => assets)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on asset creation',
          detail: e,
        });
      });
  }

  async findById(id: string): Promise<Asset> {
    return Asset.findOne({ where: { id } })
      .then(asset => {
        if (!asset) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Asset not found',
            detail: `No asset was found for the provided ID: ${id}.`,
          });
        }

        return asset;
      })
      .catch(e => {
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on asset findById',
          detail: e,
        });
      });
  }

  async update(id: string, payload: IUpdateAssetPayload): Promise<Asset> {
    return Asset.update({ id }, payload)
      .then(() => this.findById(id))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on asset update',
          detail: e,
        });
      });
  }

  async delete(id: string): Promise<boolean> {
    return Asset.update({ id }, { deletedAt: new Date() })
      .then(() => true)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on asset deletion',
          detail: e,
        });
      });
  }

  async list(): Promise<Asset[]> {
    return Asset.find()
      .then(assets => assets)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on assets list',
          detail: e,
        });
      });
  }
}

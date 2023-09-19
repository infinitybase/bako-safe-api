import { Witness } from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  IWitnessService,
  ICreateWitnessPayload,
  IUpdateWitnessPayload,
} from './types';

export class WitnessService implements IWitnessService {
  async create(payload: ICreateWitnessPayload): Promise<Witness> {
    return Witness.create(payload)
      .save()
      .then(witness => witness)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on witness creation',
          detail: e,
        });
      });
  }

  async findById(id: string): Promise<Witness> {
    return Witness.findOne({ where: { id } })
      .then(witness => {
        if (!witness) {
          throw new NotFound({
            type: ErrorTypes.NotFound,
            title: 'Witness not found',
            detail: `No witness was found for the provided ID: ${id}.`,
          });
        }

        return witness;
      })
      .catch(e => {
        if (e instanceof GeneralError) throw e;

        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on witness findById',
          detail: e,
        });
      });
  }

  async update(id: string, payload: IUpdateWitnessPayload): Promise<Witness> {
    return Witness.update({ id }, payload)
      .then(() => this.findById(id))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on witness update',
          detail: e,
        });
      });
  }

  async delete(id: string): Promise<boolean> {
    return Witness.update({ id }, { deletedAt: new Date() })
      .then(() => true)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on witness deletion',
          detail: e,
        });
      });
  }

  async list(): Promise<Witness[]> {
    return Witness.find()
      .then(witnesses => witnesses)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on witnesses list',
          detail: e,
        });
      });
  }
}

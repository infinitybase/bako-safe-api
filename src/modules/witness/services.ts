import { Witness } from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { IOrdination, setOrdination } from '@utils/ordination';
import { PaginationParams } from '@utils/pagination';

import {
  IWitnessService,
  ICreateWitnessPayload,
  IUpdateWitnessPayload,
} from './types';

export class WitnessService implements IWitnessService {
  private _ordination: IOrdination<Witness>;
  private _pagination: PaginationParams;
  // private _filter: ITransactionFilterParams;

  // filter(filter: ITransactionFilterParams) {
  //   this._filter = filter;
  //   return this;
  // }

  paginate(pagination?: PaginationParams) {
    this._pagination = pagination;
    return this;
  }

  ordination(ordination?: IOrdination<Witness>) {
    this._ordination = setOrdination(ordination);
    return this;
  }

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
}

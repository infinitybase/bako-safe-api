import { IOrdination, setOrdination } from '@src/utils/ordination';

import { Predicate } from '@models/index';

import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';
import { Unauthorized } from '@utils/error/Unauthorized';

import { IAddPredicatePayload, IPredicateService } from './types';

export class PredicateService implements IPredicateService {
  private _ordination: IOrdination<Predicate>;

  async add(payload: IAddPredicatePayload): Promise<Predicate> {
    try {
      const predicate = await Predicate.create(payload).save();

      return predicate;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate creation',
        detail: e,
      });
    }
  }

  async findAll(): Promise<Predicate[]> {
    try {
      const predicate = await Predicate.find();

      return predicate;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findAll',
        detail: e,
      });
    }
  }

  async findById(id: number): Promise<Predicate> {
    try {
      const predicate = await Predicate.findOne({
        where: {
          id,
        },
      });

      return predicate;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findById',
        detail: e,
      });
    }
  }

  async findByAdresses(addresses: string[]): Promise<Predicate> {
    try {
      const predicate = await Predicate.findOne({
        where: {
          addresses,
        },
      });

      return predicate;
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on predicate findByAdresses',
        detail: e,
      });
    }
  }

  ordination(ordination: IOrdination<Predicate>) {
    this._ordination = setOrdination(ordination);
    return this;
  }
}

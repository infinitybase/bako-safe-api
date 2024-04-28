import { Witness } from '@models/index';

import { NotFound } from '@utils/error';
import GeneralError, { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  ICreateWitnessPayload,
  IUpdateWitnessPayload,
  IWitnessService,
} from './types';

export class WitnessService implements IWitnessService {
  async create(payload: ICreateWitnessPayload): Promise<Witness> {
    return await Witness.create(payload)
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

  async findByTransactionId(transactionId: string, isSigned?: boolean) {
    const queryBuilder = Witness.createQueryBuilder(
      'w',
    ).where('w.transactionID = :transactionId', { transactionId });
    isSigned && queryBuilder.andWhere('w.signature is not null');

    return await queryBuilder
      .getMany()
      .then(witnesses => witnesses)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on witnesses list',
          detail: e,
        });
      });
  }

  async findById(id: string): Promise<Witness> {
    return await Witness.findOne({ where: { id } })
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
    return await Witness.update(
      { id },
      {
        ...payload,
        updatedAt: new Date(),
      },
    )
      .then(async () => {
        return await this.findById(id);
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on witness update',
          detail: e,
        });
      });
  }

  async delete(id: string): Promise<boolean> {
    return await Witness.update({ id }, { deletedAt: new Date() })
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

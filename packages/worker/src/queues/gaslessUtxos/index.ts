import { Collection } from 'mongodb';
import { GaslessUtxo, type ReserveUtxoOptions, GaslessUtxoStats } from './types';
import { findAvailable } from './utils/findAvailable';
import { reserve } from './utils/reserve';
import { release } from './utils/release';
import { markSpent } from './utils/markSpent';
import { getStats } from './utils/getStats';
import { releaseExpired } from './utils/releaseExpired';

export const gaslessUtxosCollection = (collection: Collection<GaslessUtxo>) => ({
  findAvailable: (): Promise<GaslessUtxo[]> => findAvailable(collection),
  reserve: (options: ReserveUtxoOptions): Promise<GaslessUtxo | null> => reserve(collection, options),
  release: (utxoId: string): Promise<GaslessUtxo | null> => release(collection, utxoId),
  markSpent: (utxoId: string, spentTxHash: string): Promise<GaslessUtxo | null> => markSpent(collection, utxoId, spentTxHash),
  getStats: (): Promise<GaslessUtxoStats> => getStats(collection),
  releaseExpired: (): Promise<number> => releaseExpired(collection),
});

export * from './types';
export * from './constants';
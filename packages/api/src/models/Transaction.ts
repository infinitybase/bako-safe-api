import {
  ITransactionResume,
  ITransactionSummary,
  TransactionStatus,
  TransactionType,
} from 'bakosafe';
import {
  TransactionRequest,
  TransactionType as FuelTransactionType,
  hexlify,
  Network,
} from 'fuels';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { User } from '@models/User';

import { Base } from './Base';
import { Predicate } from './Predicate';
import { ITransactionResponse } from '@src/modules/transaction/types';
import { formatAssets } from '@src/utils/formatAssets';
import { networks } from '@src/mocks/networks';
import { cachedAssets } from '@src/server/storage/fuelAssetsFetcher';
import { handleFuelUnitAssets } from '@src/utils/assets';

const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

export { TransactionStatus, TransactionType };

@Entity('transactions')
class Transaction extends Base {
  @Column()
  name: string;

  @Column()
  hash: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.TRANSACTION_SCRIPT,
  })
  type: TransactionType;

  @Column({
    type: 'jsonb',
    name: 'tx_data',
  })
  txData: TransactionRequest;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.AWAIT_REQUIREMENTS,
  })
  status: TransactionStatus;
  @Column({
    type: 'jsonb',
    name: 'summary',
  })
  summary?: ITransactionSummary;

  @Column()
  sendTime?: Date;

  @Column()
  gasUsed?: string;

  @Column({
    type: 'jsonb',
    name: 'resume',
  })
  resume: ITransactionResume;

  @Column({
    type: 'jsonb',
    name: 'network',
    default: {
      url: FUEL_PROVIDER ?? networks['devnet'],
      chainId: Number(FUEL_PROVIDER_CHAIN_ID) ?? 0,
    },
  })
  network: Network;

  @JoinColumn({ name: 'created_by' })
  @ManyToOne(() => User)
  createdBy: User;

  @Column({ name: 'predicate_id' })
  predicateId: string;

  @JoinColumn({ name: 'predicate_id' })
  @ManyToOne(() => Predicate)
  predicate: Predicate;

  static getTypeFromTransactionRequest(transactionRequest: TransactionRequest) {
    const { type } = transactionRequest;
    const transactionType = {
      [FuelTransactionType.Create]: TransactionType.TRANSACTION_CREATE,
      [FuelTransactionType.Script]: TransactionType.TRANSACTION_SCRIPT,
      [FuelTransactionType.Upgrade]: TransactionType.TRANSACTION_UPGRADE,
      [FuelTransactionType.Upload]: TransactionType.TRANSACTION_UPLOAD,
      [FuelTransactionType.Blob]: TransactionType.TRANSACTION_BLOB,
      default: TransactionType.TRANSACTION_SCRIPT,
    };

    return transactionType[type] ?? transactionType.default;
  }

  static formatTransactionResponse(transaction: Transaction): ITransactionResponse {
    const fuelUnitAssets = (chainId: number, assetId: string): number =>
      handleFuelUnitAssets(cachedAssets ?? [], chainId, assetId);

    const assets = formatAssets(
      transaction.txData.outputs,
      undefined,
      transaction.network.chainId,
      fuelUnitAssets,
    );
    const result = Object.assign(transaction, {
      assets,
    });

    return result;
  }

  getWitnesses() {
    const witnesses = this.resume.witnesses
      .filter(w => !!w.signature)
      .map(w => w.signature);

    const { witnesses: txWitnesses } = this.txData;

    if ('bytecodeWitnessIndex' in this.txData) {
      const { bytecodeWitnessIndex } = this.txData;
      const bytecode = txWitnesses[bytecodeWitnessIndex];

      bytecode && witnesses.splice(bytecodeWitnessIndex, 0, hexlify(bytecode));
    }

    if ('witnessIndex' in this.txData) {
      const { witnessIndex } = this.txData;
      const bytecode = txWitnesses[witnessIndex];

      bytecode && witnesses.splice(witnessIndex, 0, hexlify(bytecode));
    }

    return witnesses;
  }
}

export { Transaction };

// -- Criação de índice para a coluna 'transaction_id' na tabela 'assets'
// CREATE INDEX idx_assets_transaction_id ON assets(transaction_id);

// -- Criação de índice para a coluna 'transaction_id' na tabela 'witnesses'
// CREATE INDEX idx_witnesses_transaction_id ON witnesses(transaction_id);

// -- Criação de índice para a coluna 'predicate_id' na tabela 'transactions'
// CREATE INDEX idx_transactions_predicate_id ON transactions(predicate_id);

// -- Criação de índice para a coluna 'created_by' na tabela 'transactions'
// CREATE INDEX idx_transactions_created_by ON transactions(created_by);

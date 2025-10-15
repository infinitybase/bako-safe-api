import {
  ITransactionResume,
  ITransactionSummary,
  TransactionStatus,
  TransactionType,
} from 'bakosafe';
import {
  TransactionType as FuelTransactionType,
  hexlify,
  Network,
  TransactionRequest,
} from 'fuels';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { User } from '@models/User';

import { networks } from '@src/constants/networks';
import { ITransactionResponse } from '@src/modules/transaction/types';
import {
  AssetFormat,
  formatAssetFromOperations,
  formatAssetFromRampTransaction,
  formatAssets,
  parseAmount,
} from '@src/utils/formatAssets';
import { Base } from './Base';
import { Predicate } from './Predicate';
import { RampTransaction } from './RampTransactions';

const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

export enum TransactionTypeBridge {
  BRIDGE = 'BRIDGE',
}

export enum TransactionTypeWithRamp {
  ON_RAMP_DEPOSIT = 'ON_RAMP_DEPOSIT',
  OFF_RAMP_WITHDRAW = 'OFF_RAMP_WITHDRAW',
}

export enum TransactionStatusWithRamp {
  PENDING_PROVIDER = 'pending_provider',
}

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
  type: TransactionType | TransactionTypeWithRamp | TransactionTypeBridge;

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
  status: TransactionStatus | TransactionStatusWithRamp;
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

  @OneToOne(() => RampTransaction, rampTransaction => rampTransaction.transaction, {
    nullable: true,
  })
  rampTransaction?: RampTransaction;

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
    let assets: AssetFormat[] = [];
    const RAMP_OPERATIONS: string[] = [
      TransactionTypeWithRamp.ON_RAMP_DEPOSIT,
      TransactionTypeWithRamp.OFF_RAMP_WITHDRAW,
    ];

    const isOnOffRamp = RAMP_OPERATIONS.includes(transaction.type);

    if (isOnOffRamp) {
      assets = formatAssetFromRampTransaction(transaction);
    } else if (transaction.summary?.operations && transaction?.predicate) {
      assets = formatAssetFromOperations(
        transaction.summary.operations,
        transaction.predicate.predicateAddress,
      );
    } else {
      assets = formatAssets(transaction.txData.outputs, undefined);
    }

    const result = Object.assign(transaction, {
      assets,
      rampTransaction: transaction.rampTransaction
        ? {
            ...transaction.rampTransaction,
            fiatAmountInUsd:
              transaction.rampTransaction?.providerData?.transactionData
                ?.fiatAmountInUsd,
            providerTransaction:
              transaction.rampTransaction?.providerData?.transactionData
                ?.serviceProvider,
            providerData: undefined, // Avoid sending providerData directly
          }
        : undefined,
      summary: transaction.summary
        ? {
            ...transaction.summary,
            operations: transaction.summary?.operations?.map(o => ({
              ...o,
              assetsSent: o.assetsSent?.map(a => ({
                ...a,
                amount: parseAmount(a.amount),
              })),
            })),
          }
        : undefined,
    });

    return result;
  }

  getWitnesses() {
    try {
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
    } catch (e) {
      console.log('[GET_SIGN_ERROR]');
      console.log(e);
    }
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

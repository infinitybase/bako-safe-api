import {
  TransactionStatus,
  ITransactionResume,
  ITransactionSummary,
} from 'bakosafe';
import { TransactionRequest, TransactionType as FuelTransactionType } from 'fuels';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { User } from '@models/User';

import { Base } from './Base';
import { Predicate } from './Predicate';
import { Witness } from './Witness';

export enum TransactionType {
  TRANSACTION_SCRIPT = 'TRANSACTION_SCRIPT',
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  DEPOSIT = 'DEPOSIT',
}

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

  @JoinColumn({ name: 'created_by' })
  @ManyToOne(() => User)
  createdBy: User;

  @OneToMany(() => Witness, witness => witness.transaction, { cascade: ['insert'] })
  witnesses: Witness[];

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
      default: TransactionType.TRANSACTION_SCRIPT,
    };

    return transactionType[type] ?? transactionType.default;
  }

  static getInputsFromTransactionRequest(transactionRequest: TransactionRequest) {
    const inputs = transactionRequest.inputs.map(input => {
      if ('predicate' in input) {
        const { predicate, ...rest } = input;
        return rest;
      }

      return input;
    });

    return inputs;
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

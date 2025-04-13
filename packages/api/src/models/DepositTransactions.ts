import { Column, Entity } from 'typeorm';

import { Base } from './Base';
import {
  ITransactionSummary,
  TransactionStatus,
  TransactionType,
} from 'bakosafe';
import { Network } from 'fuels';
import { networks } from '@src/mocks/networks';

const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

@Entity('deposit_transactions')
class DepositTransactions extends Base {
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

  @Column({
    type: 'jsonb',
    name: 'network',
    default: {
      url: FUEL_PROVIDER ?? networks['devnet'],
      chainId: Number(FUEL_PROVIDER_CHAIN_ID) ?? 0,
    },
  })
  network: Network;

  @Column({ name: 'predicate_id' })
  predicateId: string;
}

export { DepositTransactions };


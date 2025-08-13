import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { IMeldProviderData } from '@src/modules/meld/types';
import { Transaction } from '.';
import { Base } from './Base';
import { User } from './User';

export enum RampTransactionProvider {
  MELD = 'MELD',
}

export type ProviderData = IMeldProviderData;

@Entity('ramp_transactions')
export class RampTransaction extends Base {
  @Column({ name: 'provider', type: 'varchar' })
  provider: RampTransactionProvider;

  @Column({
    type: 'jsonb',
    name: 'provider_data',
  })
  providerData: ProviderData;

  @JoinColumn({ name: 'user_id' })
  @ManyToOne(() => User)
  user: User;

  @OneToOne(() => Transaction, transaction => transaction.rampTransaction, {
    nullable: true,
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: Transaction;

  @Column({ name: 'source_currency', type: 'varchar', nullable: true })
  sourceCurrency?: string;

  @Column({ name: 'source_amount', type: 'varchar', nullable: true })
  sourceAmount?: string;

  @Column({ name: 'destination_currency', type: 'varchar', nullable: true })
  destinationCurrency?: string;

  @Column({ name: 'destination_amount', type: 'varchar', nullable: true })
  destinationAmount?: string;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod?: string;
}

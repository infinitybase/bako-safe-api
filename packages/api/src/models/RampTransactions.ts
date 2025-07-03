import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { IMeldProviderData } from '@src/modules/meld/types';
import { Transaction } from '.';
import { Base } from './Base';
import { User } from './User';

export enum RampTransactionProvider {
  MELD = 'MELD',
}

@Entity('ramp_transactions')
export class RampTransaction extends Base {
  @Column({ name: 'provider', type: 'varchar' })
  provider: RampTransactionProvider;

  @Column({
    type: 'jsonb',
    name: 'provider_data',
  })
  providerData: IMeldProviderData;

  @JoinColumn({ name: 'user_id' })
  @ManyToOne(() => User)
  user: User;

  @JoinColumn({ name: 'transaction_id' })
  @ManyToOne(() => Transaction, { nullable: true })
  transaction?: Transaction;
}

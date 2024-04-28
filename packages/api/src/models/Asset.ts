import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Base } from './Base';
import { Transaction } from './Transaction';

@Entity('assets')
class Asset extends Base {
  @Column()
  assetId: string;

  @Column()
  to: string;

  @Column()
  amount: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @JoinColumn({ name: 'transaction_id' })
  @ManyToOne(() => Transaction)
  transaction: Transaction;
}

export { Asset };

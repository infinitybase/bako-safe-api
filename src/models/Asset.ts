import {
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { Base } from './Base';
import { Transaction } from './Transaction';

@Entity('assets')
class Asset extends Base {
  @Column()
  assetID: string;

  @Column()
  to: string;

  @Column()
  amount: string;

  @Column()
  transactionID: string;

  @JoinColumn({ name: 'transactionID' })
  @ManyToOne(() => Transaction)
  transaction: Transaction;
}

export { Asset };

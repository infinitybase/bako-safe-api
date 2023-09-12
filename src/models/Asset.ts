import {
  BeforeInsert,
  BeforeUpdate,
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
  amount: number;

  @JoinColumn({ name: 'transactionID' })
  @ManyToOne(() => Transaction)
  transaction: Transaction;

  @BeforeInsert()
  @BeforeUpdate()
  multiplyByOneHundred() {
    if (this.amount) {
      this.amount = this.amount * 100;
    }
  }
}

export { Asset };

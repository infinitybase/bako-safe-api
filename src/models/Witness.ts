import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Base } from './Base';
import { Transaction } from './Transaction';

@Entity('witnesses')
class Witness extends Base {
  @Column()
  signature: string;

  @Column()
  account: string;

  @Column()
  transactionID: string;

  @JoinColumn({ name: 'transactionID' })
  @ManyToOne(() => Transaction)
  transaction: Transaction;
}

export { Witness };

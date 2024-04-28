import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Base } from './Base';
import { Transaction } from './Transaction';

export enum WitnessesStatus {
  REJECTED = 'REJECTED',
  DONE = 'DONE',
  PENDING = 'PENDING',
}

@Entity('witnesses')
class Witness extends Base {
  @Column()
  signature?: string;

  @Column()
  account: string;

  @Column({ nullable: false })
  status: WitnessesStatus;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @JoinColumn({ name: 'transaction_id' })
  @ManyToOne(() => Transaction)
  transaction: Transaction;
}

export { Witness };

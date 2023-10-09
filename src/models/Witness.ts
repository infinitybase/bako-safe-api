import { BeforeUpdate, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { TransactionService } from '@src/modules/transaction/services';

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

  @Column()
  transactionID: string;

  @JoinColumn({ name: 'transactionID' })
  @ManyToOne(() => Transaction)
  transaction: Transaction;
}

export { Witness };

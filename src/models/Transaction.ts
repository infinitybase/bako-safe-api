import {
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { TransactionService } from '@src/modules/transaction/services';

import { User } from '@models/User';

import { Asset } from './Asset';
import { Base } from './Base';
import { Predicate } from './Predicate';
import { Witness } from './Witness';

//todo -> import to sdk package
export enum TransactionStatus {
  AWAIT_REQUIREMENTS = 'await_requirements', // -> AWAIT SIGNATURES
  PENDING_SENDER = 'pending_sender', // -> AWAIT SENDER, BEFORE AWAIT STATUS
  SUCCESS = 'success', // -> SENDED
  FAILED = 'failed', // -> FAILED
}

@Entity('transactions')
class Transaction extends Base {
  @Column({ name: 'predicate_address' })
  predicateAddress: string;

  @Column()
  predicateID: string;

  @Column()
  name: string;

  @Column()
  hash: string;

  @Column({ enum: TransactionStatus })
  status: TransactionStatus;

  @Column()
  sendTime?: Date;

  @Column()
  gasUsed?: string;

  @Column()
  resume: string;

  @JoinColumn({ name: 'created_by' })
  @ManyToOne(() => User)
  createdBy: User;

  @OneToMany(() => Asset, asset => asset.transaction, { cascade: ['insert'] })
  assets: Asset[];

  @OneToMany(() => Witness, witness => witness.transaction)
  witnesses: Witness[];

  @JoinColumn({ name: 'predicateID' })
  @ManyToOne(() => Predicate)
  predicate: Predicate;
}

export { Transaction };

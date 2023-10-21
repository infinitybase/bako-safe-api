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
  PROCESS_ON_CHAIN = 'process_on_chain', // -> AWAIT DONE ON CHAIN
  SUCCESS = 'success', // -> SENDED
  FAILED = 'failed', // -> FAILED
}

export enum TransactionProcessStatus {
  SUCCESS = 'SuccessStatus',
  SQUIZED = 'SqueezedOutStatus',
  SUBMITED = 'SubmittedStatus',
  FAILED = 'FailureStatus',
}

export interface ITransactionResume {
  status: TransactionProcessStatus;
  hash?: string;
  gasUsed?: string;
  sendTime?: Date;
  witnesses?: string[];
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

  @Column({ name: 'id_on_chain' })
  idOnChain: string;

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

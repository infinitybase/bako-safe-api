import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { User } from '@models/User';

import { Asset } from './Asset';
import { Base } from './Base';
import { Predicate } from './Predicate';
import { Witness } from './Witness';

export enum TransactionStatus {
  AWAIT = 'AWAIT',
  DONE = 'DONE',
  PENDING = 'PENDING',
}

@Entity('transactions')
class Transaction extends Base {
  @Column()
  predicateAdress: string;

  @Column()
  predicateID: string;

  @Column()
  name: string;

  @Column()
  txData: string;

  @Column()
  hash: string;

  @Column({ enum: TransactionStatus })
  status: TransactionStatus;

  @Column()
  sendTime: Date;

  @Column()
  gasUsed: string;

  @Column()
  resume: string;

  @JoinColumn({ name: 'created_by' })
  @ManyToOne(() => User)
  createdBy: User;

  @OneToMany(() => Asset, asset => asset.transaction, { cascade: true })
  assets: Asset[];

  @OneToMany(() => Witness, witness => witness.transaction)
  witnesses: Witness[];

  @JoinColumn({ name: 'predicateID' })
  @ManyToOne(() => Predicate)
  predicate: Predicate;
}

export { Transaction };

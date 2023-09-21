import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Asset } from './Asset';
import { Base } from './Base';
import { Predicate } from './Predicate';
import { Witness } from './Witness';

//todo -> import to sdk package
export enum TransactionStatus {
  AWAIT_REQUIREMENTS = 'AWAIT_REQUIREMENTS', // -> AWAIT SIGNATURES
  PENDING_SENDER = 'PENDING', // -> AWAIT SENDER, BEFORE AWAIT STATUS
  DONE = 'DONE', // -> SENDED
}

@Entity('transactions')
class Transaction extends Base {
  @Column()
  predicateAddress: string;

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
  sendTime?: Date;

  @Column()
  gasUsed?: string;

  @Column()
  resume: string;

  @ManyToMany(() => Asset)
  @JoinTable({
    name: 'transactions_assets',
    joinColumn: { name: 'asset_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'transaction_id', referencedColumnName: 'id' },
  })
  assets: Asset[];

  @OneToMany(() => Witness, witness => witness.transaction)
  witnesses: Witness[];

  @JoinColumn({ name: 'predicateID' })
  @ManyToOne(() => Predicate)
  predicate: Predicate;
}

export { Transaction };

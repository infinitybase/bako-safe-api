import { Column, Entity, OneToMany } from 'typeorm';

import { Asset } from './Asset';
import { Base } from './Base';
import { Witness } from './Witness';

@Entity('transactions')
class Transaction extends Base {
  @Column()
  predicateAdress: string;

  @Column()
  predicateID: number;

  @Column()
  name: string;

  @Column()
  txData: string;

  @Column()
  hash: string;

  @Column()
  status: string;

  @Column()
  sendTime: Date;

  @Column()
  gasUsed: string;

  @Column()
  resume: string;

  @OneToMany(() => Asset, asset => asset.transaction)
  assets: Asset[];

  @OneToMany(() => Witness, witness => witness.transaction)
  witnesses: Witness[];
}

export { Transaction };

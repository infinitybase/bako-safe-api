import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
} from 'typeorm';

import { Base } from './Base';
import { Predicate } from './Predicate';
import { User } from './User';

@Entity('dapp')
class DApp extends Base {
  @Column({ name: 'session_id' })
  sessionId: string;

  @Column()
  origin: string;

  @Column({ nullable: true })
  name: string;

  @JoinTable({
    name: 'apps_connected',
    joinColumn: { name: 'dapp_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'predicate_id', referencedColumnName: 'id' },
  })
  @ManyToMany(() => Predicate)
  vaults: Predicate[];

  @JoinColumn({ name: 'current' })
  @OneToOne(() => Predicate)
  currentVault: Predicate;

  @JoinColumn({ name: 'user' })
  @OneToOne(() => User)
  user: User;
}

export { DApp };

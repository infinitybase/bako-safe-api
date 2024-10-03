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
import { Network } from 'fuels';
import { networks } from '@src/mocks/networks';

const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

@Entity('dapp')
class DApp extends Base {
  @Column({ name: 'session_id' })
  sessionId: string;

  @Column()
  origin: string;

  @Column({ nullable: true })
  name: string;

  @Column({
    type: 'jsonb',
    name: 'network',
    default: {
      url: FUEL_PROVIDER ?? networks['devnet'],
      chainId: Number(FUEL_PROVIDER_CHAIN_ID) ?? 0,
    },
  })
  network: Network;

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

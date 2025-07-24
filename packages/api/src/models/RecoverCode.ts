import { Address, Network } from 'fuels';
import { Column, Entity, BeforeInsert, JoinColumn, OneToOne } from 'typeorm';

import { Base } from './Base';

import { User } from './User';
import { networks } from '@src/constants/networks';

const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

export enum RecoverCodeType {
  AUTH = 'AUTH',
  TX_CONNECTOR = 'TX_CONNECTOR',
  AUTH_ONCE = 'AUTH_ONCE',
}

@Entity('recover_codes')
class RecoverCode extends Base {
  @Column()
  origin: string;

  @JoinColumn({ name: 'owner' })
  @OneToOne(() => User)
  owner: User;

  @Column()
  type: RecoverCodeType;

  @Column()
  code: string;

  @Column({
    type: 'jsonb',
    name: 'network',
    default: {
      url: FUEL_PROVIDER ?? networks['devnet'],
      chainId: Number(FUEL_PROVIDER_CHAIN_ID) ?? 0,
    },
  })
  network: Network;

  @Column({ name: 'valid_at' })
  validAt: Date;

  @Column({ name: 'metadata', type: 'jsonb' })
  metadata: { [key: string]: string | number | boolean | object };

  @Column()
  used: boolean;

  @BeforeInsert()
  insertCreatedAtAndUpdatedAt() {
    this.used = false;

    if (!this.code) {
      this.code = `code${Address.fromRandom().toHexString()}`;
    }
  }
}

export { RecoverCode };

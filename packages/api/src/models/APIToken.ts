import { Base } from '@models/Base';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Predicate } from '@models/Predicate';
import { Network } from 'fuels';
import { networks } from '@src/constants/networks';

export const DEFAULT_TRANSACTION_TITLE = 'Contract deployment';
const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

export interface APITokenConfig {
  transactionTitle: string;
}

@Entity('api_tokens')
class APIToken extends Base {
  @Column()
  name: string;

  @Column({ select: false })
  token: string;

  @Column({
    type: 'jsonb',
  })
  config: APITokenConfig = {
    transactionTitle: '',
  };

  @Column({
    type: 'jsonb',
    name: 'network',
    default: {
      url: FUEL_PROVIDER ?? networks['devnet'],
      chainId: Number(FUEL_PROVIDER_CHAIN_ID) ?? 0,
    },
  })
  network: Network;

  @JoinColumn({ name: 'predicate_id' })
  @ManyToOne(() => Predicate)
  predicate: Predicate;
}

export { APIToken };

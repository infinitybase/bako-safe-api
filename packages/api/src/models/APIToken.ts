import { Base } from '@models/Base';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Predicate } from '@models/Predicate';
import { Network } from 'fuels';

export const DEFAULT_TRANSACTION_TITLE = 'Contract deployment';

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
    transactionTitle: DEFAULT_TRANSACTION_TITLE,
  };

  @Column({
    type: 'jsonb',
    name: 'network',
  })
  network: Network;

  @JoinColumn({ name: 'predicate_id' })
  @ManyToOne(() => Predicate)
  predicate: Predicate;
}

export { APIToken };

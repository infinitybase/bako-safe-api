import { Column, Entity } from 'typeorm';
import { Base } from './Base';

@Entity('total_values_locked')
class TotalValueLocked extends Base {
  @Column({ name: 'asset_id' })
  assetId: string;

  @Column()
  amount: string;

  @Column({ name: 'amount_usd' })
  amountUSD: number;
}

export { TotalValueLocked };

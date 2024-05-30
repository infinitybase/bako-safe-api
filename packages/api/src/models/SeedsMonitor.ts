import { Column, Entity } from 'typeorm';

import { Base } from './Base';

@Entity('seeds_monitor')
class SeedsMonitor extends Base {
  @Column({ nullable: false })
  filename: string;
}

export { SeedsMonitor };

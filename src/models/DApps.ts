import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

import { Base } from './Base';
import { User } from './User';

@Entity('dapp')
class DApps extends Base {
  @Column({ name: 'session_id' })
  sessionId: string;

  @Column()
  url: string;

  @Column()
  name: string;

  @JoinTable({
    name: 'apps_connected',
    joinColumn: { name: 'dapp_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  @ManyToMany(() => User)
  users: User[];
}

export { DApps };

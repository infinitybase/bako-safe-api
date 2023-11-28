import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { Base } from './Base';
import { User } from './User';

export enum NotificationTitle {
  TRANSACTION_CREATED = 'Transaction Created',
  TRANSACTION_COMPLETED = 'Transaction Completed',
  TRANSACTION_DECLINED = 'Transaction Declined',
  TRANSACTION_SIGNED = 'Transaction Signed',
  NEW_VAULT_CREATED = 'New Vault Created',
}

@Entity('notifications')
class Notification extends Base {
  @Column()
  user_id: string;

  @Column({
    type: 'enum',
    enum: NotificationTitle,
  })
  title: NotificationTitle;

  @Column()
  description: string;

  @Column()
  redirect: string;

  @Column()
  read: boolean;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;
}

export { Notification };

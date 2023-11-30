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

export interface NotificationSummary {
  vaultId: string;
  vaultName: string;
  transactionId?: string;
  transactionName?: string;
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

  @Column({
    type: 'jsonb',
    name: 'summary',
  })
  summary: NotificationSummary;

  @Column()
  read: boolean;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;
}

export { Notification };

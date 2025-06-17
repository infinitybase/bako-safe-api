import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { Base } from './Base';
import { User } from './User';
import { networks } from '@src/constants/networks';
import { Network } from 'fuels';

export enum NotificationTitle {
  TRANSACTION_CREATED = 'Transaction Created',
  TRANSACTION_COMPLETED = 'Transaction Completed',
  TRANSACTION_DECLINED = 'Transaction Declined',
  TRANSACTION_SIGNED = 'Transaction Signed',
  NEW_VAULT_CREATED = 'New Vault Created',
}

export interface NotificationSummary {
  workspaceId: string;
  vaultId: string;
  vaultName: string;
  transactionId?: string;
  transactionName?: string;
}

const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

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

  @Column({
    type: 'jsonb',
    name: 'network',
    default: {
      url: FUEL_PROVIDER ?? networks['devnet'],
      chainId: Number(FUEL_PROVIDER_CHAIN_ID) ?? 0,
    },
  })
  network: Network;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;
}

export { Notification };

// -- Criação de índice para a coluna 'user_id'
// CREATE INDEX idx_notifications_user_id ON notifications(user_id);

// -- Criação de índice para a coluna 'title'
// CREATE INDEX idx_notifications_title ON notifications(title);

// -- Criação de índice para a coluna 'read'
// CREATE INDEX idx_notifications_read ON notifications(read);

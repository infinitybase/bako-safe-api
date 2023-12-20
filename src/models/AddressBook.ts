import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { Base } from './Base';
import { User } from './User';
import { Workspace } from './Workspace';

export enum AddressBookType {
  PERSONAL = 'PERSONAL',
  WORKSPACE = 'WORKSPACE',
}

@Entity('address_book')
class AddressBook extends Base {
  @Column()
  nickname: string;

  @Column({ nullable: false })
  type: AddressBookType;

  @JoinColumn({ name: 'p_owner' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  POwner: User;

  @JoinColumn({ name: 'w_owner' })
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  WOwner: Workspace;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;
}

export default AddressBook;

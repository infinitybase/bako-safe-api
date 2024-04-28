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

  @JoinColumn({ name: 'owner_id' })
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  owner: Workspace;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;
}

export default AddressBook;

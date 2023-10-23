import {
  AfterInsert,
  AfterLoad,
  BeforeInsert,
  Column,
  Entity,
  OneToMany,
} from 'typeorm';

import { UserService } from '@src/modules/configs/user/service';

import { Base } from './Base';
import { Transaction } from './Transaction';
import { ResumedUser } from './User';

@Entity('predicates')
class Predicate extends Base {
  @Column()
  name: string;

  @Column()
  predicateAddress: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  minSigners: number;

  @Column()
  addresses: string;
  completeAddress: ResumedUser[];

  @Column()
  owner: string;

  @Column()
  bytes: string;

  @Column()
  abi: string;

  @Column()
  configurable: string;

  @Column()
  provider: string;

  @Column({ nullable: true })
  chainId?: number;

  @OneToMany(() => Transaction, transaction => transaction.predicate)
  transactions: Transaction[];

  @BeforeInsert()
  saveAsJson() {
    if (typeof this.addresses !== 'string') {
      this.addresses = JSON.stringify(this.addresses);
    }
  }

  @AfterInsert()
  returnParsedOnSave() {
    this.addresses = JSON.parse(this.addresses);
  }

  @AfterLoad()
  async returnParsed() {
    this.addresses = JSON.parse(this.addresses);
    const _complete: ResumedUser[] = [];
    const userService = new UserService();
    for await (const user of this.addresses) {
      await userService.findByAddress(user).then(async _user =>
        _user
          ? _complete.push({
              address: _user.address,
              name: _user.name,
              avatar: _user.avatar,
            })
          : _complete.push({
              address: user,
              name: 'Unknown',
              avatar: await userService.randomAvatar(),
            }),
      );
    }
    this.completeAddress = _complete;
  }
}

export { Predicate };

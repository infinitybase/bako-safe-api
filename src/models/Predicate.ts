import { AfterInsert, AfterLoad, BeforeInsert, Column, Entity } from 'typeorm';

import { UserService } from '@src/modules/configs/user/service';

import { Base } from './Base';
import { ResumedUser, randomAvatar } from './User';

@Entity('predicates')
class Predicate extends Base {
  @Column()
  name: string;

  @Column()
  predicateAddress: string;

  @Column()
  description: string;

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
    for await (const user of this.addresses) {
      await new UserService()
        .findByAddress(user)
        .then(user =>
          _complete.push({
            address: user.address,
            name: user.name,
            avatar: user.avatar,
          }),
        )
        .catch(async () => {
          return _complete.push({
            address: user,
            name: 'Unknown',
            avatar: await randomAvatar(),
          });
        });
    }
    this.completeAddress = _complete;
  }
}

export { Predicate };

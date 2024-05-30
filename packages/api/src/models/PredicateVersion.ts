import { Column, Entity } from 'typeorm';
import { Base } from './Base';

@Entity('predicate_versions')
class PredicateVersion extends Base {
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  code: string;

  @Column()
  bytes: string;

  @Column()
  abi: string;

  @Column({ default: true })
  active: boolean;
}

export { PredicateVersion };

import { Column, Entity } from 'typeorm';

import { Base } from './Base';

const { API_DEFAULT_PROVIDER } = process.env;

export type WebAuthn = {
  id: string;
  publicKey: string;
};

@Entity('users')
class User extends Base {
  @Column()
  name?: string;

  @Column({ default: true })
  first_login: boolean;

  @Column({ default: false })
  notify: boolean;

  @Column({ default: true })
  active: boolean;

  @Column()
  email?: string;

  @Column({
    default: API_DEFAULT_PROVIDER,
  })
  provider: string;

  @Column({ type: 'jsonb' })
  webauthn: WebAuthn;

  @Column()
  address: string;

  @Column()
  avatar: string;
}

export { User };

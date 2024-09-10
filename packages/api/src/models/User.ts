import { Column, Entity } from 'typeorm';

import { Base } from './Base';

const { FUEL_PROVIDER } = process.env;

export type WebAuthn = {
  id: string;
  publicKey: string;
  origin: string;
  hardware: string;
};

export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

export const notFoundUser = {
  address: undefined,
  name: undefined,
  provider: undefined,
  avatar: undefined,
  type: undefined,
  webauthn: undefined,
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
    default: FUEL_PROVIDER,
  })
  provider: string;

  @Column({ type: 'jsonb' })
  webauthn: WebAuthn;

  @Column({
    default: TypeUser.FUEL,
  })
  type: TypeUser;

  @Column()
  address: string;

  @Column()
  avatar: string;

  @Column({ type: 'uuid', nullable: true })
  default_vault: string;
}

export { User };

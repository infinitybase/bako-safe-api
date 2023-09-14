/* eslint-disable prettier/prettier */
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

class Base extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  @BeforeInsert()
  insertCreatedAtAndUpdatedAt() {
    if (!this.id) {
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  }

  @BeforeUpdate()
  insertUpdatedAt() {
    this.updatedAt = new Date();
  }
}

export { Base };

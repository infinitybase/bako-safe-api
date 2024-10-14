import { Transaction, User, Predicate } from '@src/models';
import { databaseInstance } from '@database/connection';
import UserToken from '@models/UserToken';

const { NETWORK_URL } = process.env;
export class PointsService {
  async getSimpleTransaction(data: string, address: string): Promise<boolean> {
    return Transaction.createQueryBuilder('t')
      .where('t.status = :status', { status: 'success' })
      .andWhere("(t.resume->>'totalSigners')::int = 1")
      .andWhere('t.created_at > :data', { data })
      .andWhere(
        "EXISTS (SELECT 1 FROM jsonb_array_elements(t.resume->'witnesses') AS witness WHERE witness->>'account' = :address)",
        { address },
      )
      .andWhere("t.network->>'url' = :networkUrl", { NETWORK_URL })
      .getExists();
  }

  async getMultisigTransaction(data: string, address: string): Promise<boolean> {
    return Transaction.createQueryBuilder('t')
      .where('t.status = :status', { status: 'success' })
      .andWhere("(t.resume->>'totalSigners')::int > 1")
      .andWhere('t.created_at > :data', { data })
      .andWhere(
        "EXISTS (SELECT 1 FROM jsonb_array_elements(t.resume->'witnesses') AS witness WHERE witness->>'account' = :address)",
        { address },
      )
      .getExists();
  }

  async getUserAddressAndType(predicateAddress: string): Promise<any> {
    const signerAddressesSubQuery = databaseInstance
      .createQueryBuilder()
      .subQuery()
      .select(
        "jsonb_array_elements_text(predicate.configurable::jsonb->'SIGNERS')",
        'signer_address',
      )
      .from(Predicate, 'predicate')
      .where('predicate.predicate_address = :predicateAddress')
      .getQuery();

    return databaseInstance
      .createQueryBuilder()
      .select('user.address', 'address')
      .addSelect('user.type', 'type')
      .from(User, 'user')
      .innerJoin(
        `(${signerAddressesSubQuery})`,
        'sa',
        'user.address = sa.signer_address',
      )
      .innerJoin(UserToken, 'ut', 'ut.user_id = user.id')
      .setParameter('predicateAddress', predicateAddress)
      .getRawMany();
  }
}

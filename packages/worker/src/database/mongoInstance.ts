import { MongoDatabase } from '@/clients'

let mongoClientInstance: MongoDatabase

export async function getMongoClientInstance(): Promise<MongoDatabase> {
  if (!mongoClientInstance) {
    mongoClientInstance = await MongoDatabase.connect()
  }
  return mongoClientInstance
}
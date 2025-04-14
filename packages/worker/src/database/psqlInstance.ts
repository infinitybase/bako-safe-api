import { PsqlClient } from '@/clients'

let psqlClientInstance: PsqlClient

export async function getPsqlClientInstance(): Promise<PsqlClient> {
  if (!psqlClientInstance) {
    psqlClientInstance = await PsqlClient.connect()
  }
  return psqlClientInstance
}

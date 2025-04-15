import { PsqlClient } from '@/clients'

let psqlClientInstance: PsqlClient

export async function getPsqlClientInstance(): Promise<PsqlClient> {
  if (!psqlClientInstance) {
    psqlClientInstance = new PsqlClient()
    PsqlClient.connect();
  }
  return psqlClientInstance
}

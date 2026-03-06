import { Provider } from "fuels";
import { Vault } from "bakosafe";
import { VaultConfigFile } from "@/queues/generateTestTx/types";

type VaultConfigurable = ConstructorParameters<typeof Vault>[1];

// The Fuel predicate requires exactly 10 positions in the signers array.
// Unused positions are filled with zeros.
const MAX_SIGNERS = 10;
const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function createVault(provider: Provider, config: VaultConfigFile): Vault {
  const { signaturesCount, signers, hashPredicate, version } = config.vault;

  const paddedSigners = [
    ...signers.map((s) => s.address),
    ...Array(MAX_SIGNERS - signers.length).fill(ZERO),
  ];

  const configurable = {
    SIGNATURES_COUNT: signaturesCount,
    SIGNERS: paddedSigners,
    ...(hashPredicate ? { HASH_PREDICATE: hashPredicate } : {}),
  } satisfies VaultConfigurable;

  return new Vault(provider, configurable, version);
}
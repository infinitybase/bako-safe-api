export enum SignerType {
  FUEL = "fuel",
  EVM = "evm",
}

export interface SignerConfig {
  address: string;
  type: SignerType;
  privateKey?: string;
}

export interface VaultConfigFile {
  vault: {
    signaturesCount: number;
    signers: SignerConfig[];
    hashPredicate?: string;
    version?: string;
  };
  network: string;
  defaultAmount: string;
}

export interface SignResult {
  address: string;
  witness: string;
}

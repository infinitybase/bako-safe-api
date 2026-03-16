import { Provider, WalletUnlocked, arrayify } from "fuels";
import { ethers } from "ethers";
import { QUEUE_TRANSACTION } from "@/queues/generateTestTx/constants";
import { Vault } from "bakosafe";
import { stringToHex } from "viem";
import {
  SignerConfig,
  SignerType,
  SignResult,
} from "@/queues/generateTestTx/types";

export async function signWithSigner(
  vault: Vault,
  hashTxId: string,
  encodedTxId: string,
  signer: SignerConfig,
  provider: Provider
): Promise<SignResult | null> {
  const privateKey = process.env[signer.envKey];

  if (!privateKey) {
    console.warn(
      `[${QUEUE_TRANSACTION}] No private key found for env "${signer.envKey}" — skipping signer ${signer.address} [${signer.type}]`
    );
    return null;
  }

  switch (signer.type) {
    case SignerType.FUEL: {
      const wallet = new WalletUnlocked(privateKey, provider);
      const signature = await wallet.signMessage(hashTxId);
      return {
        address: signer.address,
        witness: vault.encodeSignature(signer.address, signature),
      };
    }

    case SignerType.EVM: {
      const evmWallet = new ethers.Wallet(privateKey);

      const messageToSign = encodedTxId.startsWith("0x")
        ? arrayify(stringToHex(hashTxId))
        : encodedTxId;

      const signature = await evmWallet.signMessage(messageToSign);
      return {
        address: signer.address,
        witness: vault.encodeSignature(signer.address, signature),
      };
    }

    default: {
      console.error(
        `[${QUEUE_TRANSACTION}] Unknown signer type: "${
          (signer as SignerConfig).type
        }"`
      );
      return null;
    }
  }
}

export async function collectWitnesses(
  vault: Vault,
  hashTxId: string,
  encodedTxId: string,
  signers: SignerConfig[],
  provider: Provider
): Promise<string[]> {
  const results = await Promise.all(
    signers.map((signer) =>
      signWithSigner(vault, hashTxId, encodedTxId, signer, provider)
    )
  );

  return results
    .filter((r): r is SignResult => r !== null)
    .map((r) => r.witness);
}

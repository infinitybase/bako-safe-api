import { hexToBytes } from '@noble/curves/abstract/utils';
import { secp256r1 } from '@noble/curves/p256';
import { Signer, hashMessage } from 'fuels';
import {
  ecrecover,
  fromRpcSig,
  hashPersonalMessage,
  pubToAddress,
} from '@ethereumjs/util';

import { User } from '@src/models';

export const recoverFuelSignature = async (digest: string, signature: string) => {
  return Signer.recoverAddress(hashMessage(digest), signature).toHexString();
};

export const recoverEvmSignature = async (digest: string, signature: string) => {
  const msgBuffer = Uint8Array.from(Buffer.from(digest));
  const msgHash = hashPersonalMessage(msgBuffer);
  const { v, r, s } = fromRpcSig(signature);
  const pubKey = ecrecover(msgHash, v, r, s);
  const recoveredAddress = Buffer.from(pubToAddress(pubKey)).toString('hex');

  return `0x${recoveredAddress}`;
};

export const recoverWebAuthnSignature = async (
  digest: string,
  signature: string,
) => {
  const address = [
    recoverPublicKey(hexToBytes(signature), hexToBytes(digest), 0),
    recoverPublicKey(hexToBytes(signature), hexToBytes(digest), 1),
  ];

  for (const addr of address) {
    try {
      const user = await User.query(
        `SELECT * FROM "users" WHERE webauthn->>'publicKey' = $1`,
        [addr],
      ).then(response => !!response[0] && response[0].address);

      if (user) {
        return user;
      }
    } catch (e) {
      continue;
    }
  }

  return undefined;
};

export function recoverPublicKey(
  signatureCompact: Uint8Array,
  digest: Uint8Array,
  recoveryBit: number,
) {
  const publicKey = secp256r1.Signature.fromCompact(signatureCompact)
    .addRecoveryBit(recoveryBit)
    .recoverPublicKey(digest);
  return `0x${publicKey.x.toString(16).padStart(64, '0')}${publicKey.y
    .toString(16)
    .padStart(64, '0')}`;
}

export function getRecoveryBit(
  publicKey: string,
  signatureCompact: Uint8Array,
  digest: Uint8Array,
) {
  return Number(recoverPublicKey(signatureCompact, digest, 0) !== publicKey);
}

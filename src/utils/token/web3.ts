import { Signer, hashMessage } from 'fuels';

export const recoverFuelSignature = async (digest: string, signature: string) => {
  return Signer.recoverAddress(hashMessage(digest), signature).bech32Address;
};

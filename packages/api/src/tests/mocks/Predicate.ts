import { readFileSync } from 'fs';
import { Predicate, WalletUnlocked } from 'fuels';
import path from 'path';

/**
 * we need deploy a predicate on network just if we can send a transaction by predicate
 *
 * if we can't send a transaction by predicate, we don't need deploy a predicate on network
 * just use a predicate loader, to instance and get balance or make transactions
 *
 */

const bytecodePath = path.resolve(
  __dirname,
  './predicate-release/bako-predicate.bin',
);
const abiPath = path.resolve(
  __dirname,
  './predicate-release/bako-predicate-abi.json',
);
const versionPath = path.resolve(
  __dirname,
  './predicate-release/bako-predicate-loader-bin-root',
);

export const deployPredicate = async (wallet: WalletUnlocked) => {
  const bytecode = new Uint8Array(readFileSync(bytecodePath));
  const abi = JSON.parse(readFileSync(abiPath, 'utf-8'));

  if (!bytecode || !abi) {
    throw new Error('Failed to read predicate bytecode or ABI');
  }

  const _predicate = new Predicate({
    abi,
    bytecode,
    provider: wallet.provider,
  });

  const predicate = await _predicate.deploy(wallet);

  const p = await predicate.waitForResult().catch(e => {
    return null;
  });

  return !!p;
};

export function getPredicateVersion(): string {
  const filePath = path.resolve(versionPath);
  return readFileSync(filePath, 'utf-8').trim();
}

import { ScriptTransactionRequest, bn, calculateGasFee } from "fuels";
import type { BN } from "fuels";
import { Vault } from "bakosafe";

export interface FeeEstimate {
  maxFee: BN;
  gasPrice: BN;
  balance: BN;
}

export async function estimateFeeWithBalance(
  vault: Vault,
  amount: string
): Promise<FeeEstimate> {
  const provider = vault.provider;
  const baseAssetId = await provider.getBaseAssetId();
  const predicateGasUsed = await vault.maxGasUsed();

  const { coins } = await vault.getCoins(baseAssetId);
  const balance = coins.reduce((acc, c) => acc.add(c.amount), bn(0));

  const transactionRequest = new ScriptTransactionRequest();
  const amountBN = bn.parseUnits(amount);

  const fakeResources = vault.generateFakeResources([
    { assetId: baseAssetId, amount: amountBN.mul(10) },
  ]);

  transactionRequest.addCoinOutput(vault.address, amountBN, baseAssetId);
  transactionRequest.addResources(fakeResources);

  const { gasPriceFactor } = await provider.getGasConfig();
  const { maxFee, gasPrice } = await provider.estimateTxGasAndFee({
    transactionRequest,
  });

  const serializedTxCount = bn(transactionRequest.toTransactionBytes().length);
  const totalGasWithBytes = predicateGasUsed.add(serializedTxCount.mul(64));

  const predicateSuccessFeeDiff = calculateGasFee({
    gas: totalGasWithBytes,
    priceFactor: gasPriceFactor,
    gasPrice,
  });

  return {
    maxFee: maxFee.add(predicateSuccessFeeDiff).mul(20).div(10),
    gasPrice,
    balance,
  };
}

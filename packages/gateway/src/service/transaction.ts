import {
  getTransactionSummaryFromRequest,
  OperationName,
  Provider,
  Transaction,
  TransactionType,
} from "fuels";
import {
  DeployTransfer,
  ITransactionSummary,
  Vault,
  UpgradeTransfer,
  UploadTransfer,
} from "bakosafe";

import { AuthService } from "@/service/auth";

type Transfer = DeployTransfer | UpgradeTransfer | UploadTransfer;

type SubmitParams<T extends TransactionType> = {
  userId: string;
  apiToken: string;
  transaction: Transaction<T>;
};

type SetSummaryParams<T extends Transfer> = {
  transfer: T;
  provider: Provider;
};

export class TransactionService {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async submitDeploy({
    apiToken,
    userId,
    transaction,
  }: SubmitParams<TransactionType.Create>) {
    const {
      code,
      vaultId,
      userAddress,
      tokenConfig,
    } = await this.authService.getSession(apiToken, userId);

    const vault = await Vault.create({
      id: vaultId,
      address: userAddress,
      token: code.value,
    });

    const deployTransfer = await vault.BakoSafeDeployContract({
      ...transaction,
      name: tokenConfig.transactionTitle,
    });

    await this.setTransactionSummary({
      transfer: deployTransfer,
      provider: vault.provider,
    });
    await this.authService.closeSession(code.id);

    return {
      vault,
      deployTransfer,
    };
  }

  async submitUpgrade({
    apiToken,
    userId,
    transaction,
  }: SubmitParams<TransactionType.Upgrade>) {
    const {
      code,
      vaultId,
      userAddress,
      tokenConfig,
    } = await this.authService.getSession(apiToken, userId);

    const vault = await Vault.create({
      id: vaultId,
      address: userAddress,
      token: code.value,
    });

    const upgradeTransfer = await vault.BakoSafeUpgrade({
      ...transaction,
      name: tokenConfig.transactionTitle,
    });

    await this.setTransactionSummary({
      transfer: upgradeTransfer,
      provider: vault.provider,
    });
    await this.authService.closeSession(code.id);

    return {
      vault,
      upgradeTransfer,
    };
  }

  async submitUpload({
    apiToken,
    userId,
    transaction,
  }: SubmitParams<TransactionType.Upload>) {
    const {
      code,
      vaultId,
      userAddress,
      tokenConfig,
    } = await this.authService.getSession(apiToken, userId);

    const vault = await Vault.create({
      id: vaultId,
      address: userAddress,
      token: code.value,
    });

    const uploadTransfer = await vault.BakoSafeUpload({
      ...transaction,
      name: `${transaction.subsectionIndex + 1}/${transaction.subsectionsNumber} ${tokenConfig.transactionTitle ?? 'Upload Transaction'} `,
    });

    await this.setTransactionSummary({
      transfer: uploadTransfer,
      provider: vault.provider,
    });
    await this.authService.closeSession(code.id);

    return {
      vault,
      uploadTransfer,
    };
  }

  private async setTransactionSummary({
    transfer,
    provider,
  }: SetSummaryParams<Transfer>) {
    const transactionSummary: ITransactionSummary = {
      type: "cli",
      operations: [],
    };

    if (transfer instanceof DeployTransfer) {
      const summaryFromRequest = await getTransactionSummaryFromRequest({
        transactionRequest: transfer.transactionRequest,
        provider,
      });
      summaryFromRequest.operations = summaryFromRequest.operations.map(
        (operation) => {
          if (operation.name === OperationName.contractCreated) {
            operation.assetsSent = [
              {
                assetId: provider.getBaseAssetId(),
                amount: transfer.transactionRequest.maxFee,
              },
            ];
          }

          return operation;
        }
      );

      transactionSummary.operations = summaryFromRequest.operations;
    }

    const query = `
				UPDATE transactions
				SET summary = $1
				WHERE id = $2
    `;

    await this.authService.database.query(query, [
      JSON.stringify(transactionSummary),
      transfer.BakoSafeTransactionId,
    ]);
  }
}

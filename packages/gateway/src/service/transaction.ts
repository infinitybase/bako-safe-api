import {
  Provider,
  OutputType,
  Transaction,
  OperationName,
  TransactionType,
  TransactionRequest,
  UpgradePurposeTypeEnum,
  UploadTransactionRequest,
  CreateTransactionRequest,
  UpgradeTransactionRequest,
  getTransactionSummaryFromRequest,
} from "fuels";
import {
  ITransactionSummary,
} from "bakosafe";

import { AuthService } from "@/service/auth";

type SubmitParams<T extends TransactionType> = {
  userId: string;
  apiToken: string;
  transaction: Transaction<T>;
};

type SetSummaryParams<T extends TransactionRequest> = {
  request: T;
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
    const { code, vault } = await this.authService.getSession(apiToken, userId);

    const contractBytecode = transaction.witnesses[transaction.bytecodeWitnessIndex];
    const contractOutput = transaction.outputs.find(
      (output) => output.type === OutputType.ContractCreated,
    );

    const request = CreateTransactionRequest.from({
      inputs: [],
      salt: transaction.salt,
      witnesses: [contractBytecode.data],
      storageSlots: transaction.storageSlots,
      outputs: [contractOutput],
      bytecodeWitnessIndex: transaction.bytecodeWitnessIndex,
    })

    const { tx: transactionRequest } = await vault.BakoTransfer(request);

    await this.setTransactionSummary({
      request: transactionRequest,
      provider: vault.provider,
    });
    await this.authService.closeSession(code.id);

    const hash = transactionRequest.getTransactionId(vault.provider.getChainId()).slice(2);

    console.log("[MUTATION] Transaction sent to Bako", transactionRequest.type, {
      vault: vault.address.toB256(),
      hash,
    });

    return {
      hash,
      vault,
      transactionRequest,
    };
  }

  async submitUpgrade({
    apiToken,
    userId,
    transaction,
  }: SubmitParams<TransactionType.Upgrade>) {
    const { code, vault } = await this.authService.getSession(apiToken, userId);

    const { upgradePurpose, witnesses } = transaction;
    let request = UpgradeTransactionRequest.from({});

    /** Upgrade consensus parameter */
    if (upgradePurpose.type === UpgradePurposeTypeEnum.ConsensusParameters) {
      const { witnessIndex } = upgradePurpose.data;
      const bytecode = witnesses[witnessIndex].data;
      request.addConsensusParametersUpgradePurpose(bytecode);
    }

    /** Upgrade state transition */
    if (upgradePurpose.type === UpgradePurposeTypeEnum.StateTransition) {
      const { bytecodeRoot } = upgradePurpose.data;
      request.addStateTransitionUpgradePurpose(bytecodeRoot);
    }

    const { tx: transactionRequest } = await vault.BakoTransfer(request);

    await this.setTransactionSummary({
      request: transactionRequest,
      provider: vault.provider,
    });
    await this.authService.closeSession(code.id);

    const hash = transactionRequest.getTransactionId(vault.provider.getChainId()).slice(2);

    console.log("[MUTATION] Transaction sent to Bako", transactionRequest.type, {
      vault: vault.address.toB256(),
      hash,
    });

    return {
      hash,
      vault,
      transactionRequest,
    };
  }

  async submitUpload({
    apiToken,
    userId,
    transaction,
  }: SubmitParams<TransactionType.Upload>) {
    const { code, vault } = await this.authService.getSession(apiToken, userId);

    const {
      witnesses,
      root,
      witnessIndex,
      subsectionsNumber,
      subsectionIndex,
      proofSet,
    } = transaction;

    const request = UploadTransactionRequest.from({});
    request.addSubsection({
      root,
      subsectionsNumber,
      subsectionIndex,
      proofSet,
      subsection: witnesses[witnessIndex].data,
    });

    const { tx: transactionRequest } = await vault.BakoTransfer(request);

    await this.setTransactionSummary({
      request: transactionRequest,
      provider: vault.provider,
    });
    await this.authService.closeSession(code.id);

    const hash = transactionRequest.getTransactionId(vault.provider.getChainId()).slice(2);

    console.log("[MUTATION] Transaction sent to Bako", transactionRequest.type, {
      vault: vault.address.toB256(),
      hash,
    });

    return {
      hash,
      vault,
      transactionRequest,
    };
  }

  private async setTransactionSummary({
    request,
    provider,
  }: SetSummaryParams<TransactionRequest>) {
    const transactionSummary: ITransactionSummary = {
      type: "cli",
      operations: [],
    };

    if (request instanceof CreateTransactionRequest) {
      const summaryFromRequest = await getTransactionSummaryFromRequest({
        transactionRequest: request,
        provider,
      });
      summaryFromRequest.operations = summaryFromRequest.operations.map(
        (operation) => {
          if (operation.name === OperationName.contractCreated) {
            operation.assetsSent = [
              {
                assetId: provider.getBaseAssetId(),
                amount: request.maxFee,
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
				WHERE hash = $2
    `;

    await this.authService.database.query(query, [
      JSON.stringify(transactionSummary),
      request.getTransactionId(provider.getChainId()).slice(2),
    ]);
  }
}

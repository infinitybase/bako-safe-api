import {
  Address,
  Provider,
  arrayify,
  InputType,
  OutputType,
  Transaction,
  OperationName,
  InputContract,
  TransactionType,
  TransactionRequest,
  UpgradePurposeTypeEnum,
  BlobTransactionRequest,
  CreateTransactionRequest,
  ScriptTransactionRequest,
  UploadTransactionRequest,
  UpgradeTransactionRequest,
  getTransactionSummaryFromRequest,
  ZeroBytes32
} from "fuels";
import { ITransactionSummary, Vault } from "bakosafe";

import { AuthService } from "@/service/auth";

type SubmitParams = {
  userId: string;
  apiToken: string;
  transaction: Transaction;
};

type SubmitTransactionParams = {
  vault: Vault;
  tokenConfig: { transactionTitle: string };
  transaction: Transaction;
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

  async submit({
    apiToken,
    userId,
    transaction,
  }: SubmitParams): Promise<{
    hash: string;
    vault: Vault;
    transactionRequest: TransactionRequest;
  }> {
    const { code, vault, tokenConfig } = await this.authService.getSession(
      apiToken,
      userId
    );

    let transactionRequest: TransactionRequest;
    switch (transaction.type) {
      case TransactionType.Create:
        transactionRequest = await this.submitDeploy({ tokenConfig, vault, transaction });
        break;
      case TransactionType.Upgrade:
        transactionRequest = await this.submitUpgrade({ tokenConfig, vault, transaction });
        break;
      case TransactionType.Upload:
        transactionRequest = await this.submitUpload({ tokenConfig, vault, transaction });
        break;
      case TransactionType.Blob:
        transactionRequest = await this.submitBlob({ tokenConfig, vault, transaction });
        break;
      case TransactionType.Script:
        transactionRequest = await this.submitScript({ tokenConfig, vault, transaction });
        break;
      default:
        throw new Error("Unsupported transaction type");
    }

    await this.setTransactionSummary({
      request: transactionRequest,
      provider: vault.provider,
    });
    await this.authService.closeSession(code.id);

    const hash = transactionRequest
      .getTransactionId(vault.provider.getChainId())
      .slice(2);

    return {
      hash,
      vault,
      transactionRequest,
    };
  }

  async submitDeploy({ vault, tokenConfig, transaction }: SubmitTransactionParams) {
    const contractBytecode =
      transaction.witnesses[transaction.bytecodeWitnessIndex];
    const contractOutput = transaction.outputs.find(
      (output) => output.type === OutputType.ContractCreated
    );

    const request = CreateTransactionRequest.from({
      inputs: [],
      salt: transaction.salt,
      witnesses: [contractBytecode.data],
      storageSlots: transaction.storageSlots,
      outputs: [contractOutput],
      bytecodeWitnessIndex: transaction.bytecodeWitnessIndex,
    });

    const { tx: transactionRequest } = await vault.BakoTransfer(request, {
      name: tokenConfig.transactionTitle,
    });

    return transactionRequest;
  }

  async submitUpgrade({ vault, tokenConfig, transaction }: SubmitTransactionParams) {
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

    const { tx: transactionRequest } = await vault.BakoTransfer(request, {
      name: tokenConfig.transactionTitle,
    });

    return transactionRequest;
  }

  async submitUpload({ vault, tokenConfig, transaction }: SubmitTransactionParams) {
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

    const { tx: transactionRequest } = await vault.BakoTransfer(request, {
      name: tokenConfig.transactionTitle,
    });

    return transactionRequest;
  }

  async submitBlob({ vault, tokenConfig, transaction }: SubmitTransactionParams) {
    const { blobId, witnessIndex, witnesses } = transaction;
    const bytecode = witnesses[witnessIndex].data;

    let request = BlobTransactionRequest.from({
      blobId,
      witnessIndex,
      witnesses: [bytecode],
    });

    const { tx: transactionRequest } = await vault.BakoTransfer(request, {
      name: tokenConfig.transactionTitle,
    });

    return transactionRequest;
  }

  async submitScript({ vault, tokenConfig, transaction }: SubmitTransactionParams) {
    const {inputs, scriptData, script} = transaction;

    const request = ScriptTransactionRequest.from({});
    const contractInput = inputs.find(input => input.type === InputType.Contract) as InputContract;

    if (contractInput) {
      request.addContractInputAndOutput(Address.fromAddressOrString(contractInput.contractID))
    }

    request.script = arrayify(script ?? ZeroBytes32);
    request.scriptData = arrayify(scriptData ?? ZeroBytes32);

    const { tx: transactionRequest } = await vault.BakoTransfer(request, {
      name: tokenConfig.transactionTitle,
    });

    return transactionRequest;
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

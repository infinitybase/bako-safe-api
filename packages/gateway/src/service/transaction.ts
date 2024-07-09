import { AuthService } from "@/service/auth";
import { TransactionCreate } from "fuels";

type SubmitParams = {
  userId: string;
  apiToken: string;
};

export class TransactionService {
  private readonly transaction: TransactionCreate
  private authService: AuthService

  constructor(
    transaction: TransactionCreate,
    authService: AuthService,
  ) {
    this.authService = authService;
    this.transaction = transaction;
  }

  async submit({ apiToken, userId }: SubmitParams) {
    const {
      vault,
      codeId,
      tokenConfig,
    } = await this.authService.getVaultFromApiToken(apiToken, userId);

    const deployTransfer = await vault.BakoSafeDeployContract({
      ...this.transaction,
      name: tokenConfig.transactionTitle,
    });

    await this.authService.closeSession(codeId);

    return {
      vault,
      deployTransfer,
    }
  }
}

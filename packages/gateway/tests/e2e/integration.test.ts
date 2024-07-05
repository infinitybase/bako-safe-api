import {
  VaultTestUtils,
  getGenesisWallet,
  GatewayProvider,
  DeployContractTestUtil,
} from "../utils";
import { bn, Provider, WalletUnlocked } from "fuels";
import { BakoSafe, DeployTransfer, ITransactionResume } from 'bakosafe';

describe("Deploy integrated with all applications", () => {
  let provider: Provider;
  let owner: WalletUnlocked;
  let utils: VaultTestUtils;
  let gatewayProvider: GatewayProvider;

  let token: string;
  let transferDeploy: DeployTransfer;

  BakoSafe.setProviders({
    SERVER_URL: process.env.BAKO_SERVER,
    CHAIN_URL: process.env.FUEL_PROVIDER,
  })

  beforeAll(async () => {
    provider = await Provider.create(process.env.FUEL_PROVIDER!);
    owner = getGenesisWallet(provider);
    utils = await VaultTestUtils.initialize({
      owner,
      signers: 3,
      threshold: 1,
      amount: bn.parseUnits("0.0001"),
    });
  });

  it("should create a api token", async () => {
    const response = await utils.generateApiToken();
    token = response.token;
    expect(token).toBeDefined();
  });

  it("should connect in gateway provider", async () => {
    gatewayProvider = await GatewayProvider.connect(token);
    expect(gatewayProvider).toBeDefined();
  });

  it("should get vault balance in gateway provider", async () => {
    const owner = utils.vault.address;
    const assetId = provider.getBaseAssetId();

    const fuelBalance = await provider.getBalance(owner, assetId);
    const gatewayBalance = await provider.getBalance(owner, assetId);

    expect(fuelBalance.toString()).toEqual(gatewayBalance.toString());
  });

  it("should send a transfer deploy to vault", async () => {
    const {
      contractId,
      transactionRequest,
    } = await DeployContractTestUtil.getTransactionRequest(utils.vault);

    transferDeploy = await utils.vault.BakoSafeDeployContract(
      transactionRequest.toTransaction()
    );

    expect(transferDeploy.getContractId()).toBe(contractId);
  });

  it("should get the same transfer", async () => {
    const sameTransferDeploy = (await utils.vault.BakoSafeGetTransaction(
      transferDeploy.BakoSafeTransactionId
    )) as DeployTransfer;

    expect(sameTransferDeploy).toBeInstanceOf(DeployTransfer);
    expect(sameTransferDeploy.getContractId()).toBe(
      transferDeploy.getContractId()
    );
  });

  it("should should sign the transaction", async () => {
    const isSigned = await utils.signTransaction({
      signer: owner,
      transfer: transferDeploy,
    });

    expect(isSigned).toBeTruthy();
  });

  it("should send the transaction", async () => {
    const response = (await transferDeploy.send()) as ITransactionResume;
    expect(response.status).toBe("success");
  });

  it("should call the contract", async () => {
    const { value } = await DeployContractTestUtil.callContract({
      account: owner,
      contractId: transferDeploy.getContractId(),
    });

    expect(value).toBe(true);
  });
});

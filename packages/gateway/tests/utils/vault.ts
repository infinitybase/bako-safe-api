import { BN, bn, Provider, Wallet, WalletUnlocked } from 'fuels';
import { Auth, DeployTransfer, IBakoSafeAuth, TypeUser, Vault } from "bakosafe";

const getRandomWallets = (length: number, provider: Provider) =>
  Array.from({ length }, () => Wallet.generate({ provider }));

export const getGenesisWallet = (provider: Provider) =>
  Wallet.fromPrivateKey(process.env.PRIVATE_KEY!, provider);

type CreateVault = {
  signers: number;
  threshold: number;
  owner: WalletUnlocked;
  amount: BN,
};

type SignDeploy = {
  signer: WalletUnlocked;
  transfer: DeployTransfer;
};

export class VaultTestUtils {
  constructor(
    public vault: Vault,
    public owner: WalletUnlocked,
    public signers: WalletUnlocked[],
    public auth: IBakoSafeAuth
  ) {}

  static async initialize(params: CreateVault) {
    const { signers, owner, threshold } = params;

    const provider = owner.provider;

    // Setup random signer in the vault
    const randomWallets = getRandomWallets(signers, provider);
    const wallets = [owner, ...randomWallets];

    // Create auth for the owner
    const auth = await Auth.create({
      type: TypeUser.FUEL,
      provider: provider.url,
      address: owner.address.toAddress(),
    });
    const authSignature = await owner.signMessage(auth.code);
    const authentication = await auth.sign(authSignature);

    // Create vault
    const vault = await Vault.create({
      configurable: {
        SIGNATURES_COUNT: threshold,
        SIGNERS: wallets.map((signer) => signer.address.toB256()),
        network: provider.url,
      },
      BakoSafeAuth: authentication,
    });

    // Send asset to the vault
    await owner.transfer(vault.address, params.amount);

    return new VaultTestUtils(vault, owner, randomWallets, authentication);
  }

  async generateApiToken() {
    const response = await fetch(
      `${process.env.BAKO_SERVER}/api-token/${this.vault.BakoSafeVaultId}`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "(Gateway) Test API Token",
        }),
        headers: this.header,
      }
    );

    return response.json();
  }

  async signTransaction(params: SignDeploy) {
    const { transfer, signer } = params;

    const payload = {
      confirm: true,
      account: signer.address.toAddress(),
      signer: await signer.signMessage(transfer.getHashTxId()),
    };

    const response = await fetch(
      `${process.env.BAKO_SERVER}/transaction/signer/${transfer.BakoSafeTransactionId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: this.header,
      }
    );

    return response.json();
  }

  private get header() {
    return {
      Authorization: this.auth.token,
      Signeraddress: this.auth.address,
      "Content-Type": "application/json",
    };
  }
}

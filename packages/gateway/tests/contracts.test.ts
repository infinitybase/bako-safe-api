import { Address, bn, hexlify, Provider, randomBytes, randomUUID } from "fuels";
import { launchTestNode } from "fuels/test-utils";

import { Vault, bakoCoder, SignatureType } from "bakosafe";
import { GatewayServer } from "@/server";
import { DatabaseMock } from "./mocks/auth";
import { CLITokenCoder } from "@/lib";

const PORTS = {
  NODE: "3200",
  GATEWAY: "3220"
};

const setupTestGateway = async () => {
  // Start fuel node
  const { provider, wallets, cleanup } = await launchTestNode({
    nodeOptions: {
      port: PORTS.NODE,
      args: ["--poa-instant", "false", "--poa-interval-period", "1ms"],
      loggingEnabled: false
    }
  });

  // Start gateway server
  const gateway = new GatewayServer(PORTS.GATEWAY, `http://localhost:${PORTS.NODE}/v1/graphql`);
  gateway.setDatabase(new DatabaseMock());
  await gateway.start();

  // Create vault and transfer some funds
  const vault = new Vault(provider, {
    SIGNATURES_COUNT: 1,
    SIGNERS: wallets.map((signer) => signer.address.toB256())
  });

  const request = await wallets[0].transfer(vault.address, bn(10000000));
  await request.waitForResult();

  // Set gateway provider in vault
  const token = { apiToken: hexlify(randomBytes(16)), userId: randomUUID() };
  const code = new CLITokenCoder("aes-256-cbc");
  const apiToken = code.encode(token.apiToken, token.userId);
  vault.provider = await Provider.create(`http://localhost:${PORTS.GATEWAY}/v1/graphql?api_token=${apiToken}`);

  return {
    provider, wallets, vault, cleanup, [Symbol.dispose]: () => {
      cleanup();
      gateway.stop();
    }
  };
};

describe("Contracts", () => {
  it("should ", async () => {
    using node = await setupTestGateway();
    const { vault, wallets, provider } = node;
    const [wallet] = wallets;


    const { hashTxId, tx } = await vault.transaction({
      name: "Transaction",
      assets: [
        {
          to: Address.fromRandom().toB256(),
          amount: "0.00001",
          assetId: provider.getBaseAssetId()
        }
      ]
    });

    const signature = await wallet.signMessage(hashTxId);
    tx.witnesses.push(bakoCoder.encode({
      type: SignatureType.Fuel,
      signature
    }));

    const response = await vault.send(tx);
    const { isStatusSuccess, isTypeScript } = await response.wait();

    expect(isTypeScript).toBeTruthy();
    expect(isStatusSuccess).toBeTruthy();
  });
});

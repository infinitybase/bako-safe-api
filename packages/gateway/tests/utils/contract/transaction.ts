import { Vault } from "bakosafe";
import { Account, ContractFactory } from 'fuels';

import contractByteCode from "./contracts/ContractAbi.hex";
import { ContractAbi__factory } from "./contracts";

type ConnectParams = {
  account: Account;
  contractId: string;
}

export class DeployContractTestUtil {
  static async getTransactionRequest(vault: Vault) {
    const factory = new ContractFactory(
      contractByteCode,
      ContractAbi__factory.abi,
      vault
    );

    const { storageSlots } = ContractAbi__factory;

    return factory.createTransactionRequest({ storageSlots });
  }

  static async connectContract(params: ConnectParams) {
    const { account, contractId } = params;
    return ContractAbi__factory.connect(contractId, account);
  }

  static async callContract(params: ConnectParams) {
    const contract = await this.connectContract(params);
    return contract.functions.test_function().call();
  }
}

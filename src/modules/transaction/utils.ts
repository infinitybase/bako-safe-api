import { transactionScript, IAssetGroupByTo, Vault } from 'bsafe';
import {
  ScriptTransactionRequest,
  Resource,
  Predicate,
  Address,
  InputType,
  hexlify,
  arrayify,
} from 'fuels';

import { defaultConfigurable } from '@src/utils/configurable';

export class BSAFEScriptTransaction extends ScriptTransactionRequest {
  constructor() {
    super({
      gasPrice: defaultConfigurable['gasPrice'],
      gasLimit: defaultConfigurable['gasLimit'],
      script: transactionScript,
    });
  }

  public async instanceTransaction(
    _coins: Resource[],
    vault: Vault,
    outputs: IAssetGroupByTo,
    witnesses: string[],
  ) {
    Object.entries(outputs).map(([, value]) => {
      this.addCoinOutput(Address.fromString(value.to), value.amount, value.assetId);
    });

    //todo: invalidate used coins [make using bsafe api assets?]
    this.addResources(_coins);

    this.inputs?.forEach(input => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === vault.address.toB256()
      ) {
        input.predicate = arrayify(vault.bytes);
        input.predicateData = arrayify(vault.predicateData);
      }
    });

    this.witnesses = witnesses;
  }
}

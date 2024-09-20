import {
  BakoProvider,
  Service,
  IPredicatePayload,
  PredicateResponse,
  BakoProviderOptions,
  ICreateTransactionPayload,
  ISignTransactionRequest,
  Vault,
} from "bakosafe";
import { hexlify, Provider, transactionRequestify } from "fuels";

export class FakeService extends Service {
  private static predicates: Map<
    string,
    PredicateResponse & { provider: string }
  > = new Map();
  private static transactions: Map<
    string,
    ICreateTransactionPayload
  > = new Map();

  constructor() {
    super({ address: "", token: "" });
  }

  async createPredicate(payload: IPredicatePayload) {
    const { predicateAddress, configurable, provider } = payload;

    FakeService.predicates.set(predicateAddress, {
      provider,
      predicateAddress,
      configurable: JSON.parse(configurable),
    });

    return {
      predicateAddress,
      configurable: JSON.parse(configurable),
    };
  }

  async createTransaction(params: ICreateTransactionPayload) {
    FakeService.transactions.set(params.hash, params);
    return true;
  }

  public async signTransaction(params: ISignTransactionRequest) {
    const { signature, hash } = params;

    const transaction = FakeService.transactions.get(hash.slice(2));
    if (!transaction) return false;

    transaction.txData.witnesses.push(signature);
    FakeService.transactions.set(hash, transaction);

    const request = transactionRequestify(transaction.txData);
    const predicate = FakeService.predicates.get(transaction.predicateAddress)!;
    const { configurable, provider } = predicate;

    if (request.witnesses.length >= configurable.SIGNATURES_COUNT) {
      const vault = new Vault(await Provider.create(provider), configurable);
      await vault.send(request);
    }

    return true;
  }

  public async sendTransaction(hash: string) {
    const transaction = FakeService.transactions.get(hash.slice(2));
    if (!transaction) return false;

    const request = transactionRequestify(transaction.txData);
    const predicate = FakeService.predicates.get(transaction.predicateAddress)!;
    const { configurable, provider } = predicate;

    if (request.witnesses.length >= configurable.SIGNATURES_COUNT) {
      const vault = new Vault(await Provider.create(provider), configurable);
      await vault.send(request);
    }

    return true;
  }
}

export class BakoProviderMock extends BakoProvider {
  constructor(url: string, options: BakoProviderOptions) {
    super(url, options);
    this.service = new FakeService();
  }

  static async create(url: string) {
    const provider = new BakoProviderMock(url, {
      token: "",
      address: "",
    });
    await provider.fetchChainAndNodeInfo();
    return provider;
  }
}

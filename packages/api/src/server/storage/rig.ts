import { Rig } from '@src/contracts/rig/mainnet/types';
import { networksByChainId } from '@src/constants/networks';
import { Vault } from 'bakosafe';
import { Provider } from 'fuels';

const { RIG_ID_CONTRACT } = process.env;
const MAINNET_CHAIN_ID = '9889';

export class RigInstance {
  private static instance?: RigInstance;
  private rig: Rig;

  protected constructor(rig: Rig) {
    this.rig = rig;
  }

  public async getRatio(): Promise<number> {
    const ratio = await this.rig.functions.get_sanitized_price().get();

    return Number(ratio.value.toString());
  }

  static async start(): Promise<RigInstance> {
    if (!RigInstance.instance) {
      const provider = new Provider(networksByChainId[MAINNET_CHAIN_ID]);
      const version = '';

      const vault = new Vault(
        provider,
        {
          SIGNATURES_COUNT: 1,
          SIGNERS: [],
        },
        version,
      );

      const rig = new Rig(RIG_ID_CONTRACT, vault);
      RigInstance.instance = new RigInstance(rig);
    }

    return RigInstance.instance;
  }

  static stop(): void {
    if (RigInstance.instance) {
      RigInstance.instance = undefined;
    }
  }
}

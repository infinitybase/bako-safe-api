import { Rig } from '@src/contracts/rig/mainnet/types';
import { networks } from '@src/tests/mocks/Networks';
import { Vault } from 'bakosafe';
import { Provider } from 'fuels';
const { RIG_ID_CONTRACT } = process.env;

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
      const provider = new Provider(networks['MAINNET']);
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

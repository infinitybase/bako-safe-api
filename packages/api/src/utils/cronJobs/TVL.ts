import { Predicate, TotalValueLocked } from '@src/models';
import { Asset, Vault } from 'bakosafe';
import cron from 'node-cron';
import { getAssetsMaps } from '../assets';
import App from '@src/server/app';
import { Provider } from 'fuels';
import FuelProvider from '../FuelProvider';
const { FUEL_PROVIDER } = process.env;

const VALID_PROVIDERS = [FUEL_PROVIDER];

// Executa todos os dias a meia-noite
const TVLCronJob = cron.schedule('0 0 * * *', async () => {
  console.log('[CRON_JOB]: TVL - running');
  try {
    //Validação para limitar apenas um registro diário
    const savedTVL = await TotalValueLocked.createQueryBuilder('tvl')
      .where('DATE(tvl.created_at) = CURRENT_DATE')
      .select(['tvl.id'])
      .getOne();

    if (savedTVL) {
      console.log(
        '[CRON_JOB]: TVL - has already been executed on the current date',
      );
      return;
    }

    // Busca dados de todos os vaults
    const predicates = await Predicate.createQueryBuilder('p')
      .leftJoinAndSelect('p.version', 'version')
      .select(['p.id', 'p.configurable', 'version.code'])
      .where('version.name NOT LIKE :fakeName', {
        fakeName: '%fake_name%',
      })
      .getMany();

    const vaultsBalance = [];

    for await (const predicate of predicates) {
      try {
        // const configurable: IConfVault = {
        //   ...JSON.parse(predicate.configurable),
        // };
        // todo: get by session or run a map to get for each valid networks

        const provider = await FuelProvider.create(FUEL_PROVIDER);
        const conf = JSON.parse(predicate.configurable);

        // Instancia cada vault
        const vault = new Vault(provider, conf);

        // Obtém os balances de cada vault e adiciona no array de balances
        const { balances } = await vault.getBalances();
        vaultsBalance.push(...balances);
      } catch (e) {
        console.log(
          `[CRON_JOB]: TVL - Error processing predicate ${predicate.id}: `,
          e,
        );
        continue;
      }
    }
    const _asset = await getAssetsMaps();
    const assetsTVL = await Asset.assetsGroupById(
      vaultsBalance.map(item => ({ ...item, amount: item.amount.format() })),
    );
    const validAssetsTVL = Object.entries(assetsTVL)
      // Filtro para considerar apenas assets existentes no dicionário
      .filter(([assetId, amount]) => {
        const asset = _asset.assetsMapById[assetId];
        return asset !== undefined;
      })
      .map(([assetId, amount]) => {
        return {
          amount,
          assetId,
        };
      });

    const formattedAssetsTVL = validAssetsTVL.map(async asset => {
      const formattedAmount = asset.amount.format();
      const priceUSD = await App.getInstance()._quoteCache.getQuote(asset.assetId);

      return {
        assetId: asset.assetId,
        amount: formattedAmount,
        amountUSD: Number((parseFloat(formattedAmount) * priceUSD).toFixed(2)),
      };
    });

    // Salva cada item no BD
    for await (const formattedAssetTVL of formattedAssetsTVL) {
      await TotalValueLocked.create({
        assetId: formattedAssetTVL.assetId,
        amount: formattedAssetTVL.amount,
        amountUSD: formattedAssetTVL.amountUSD,
      }).save();
    }

    console.log(
      `[CRON_JOB]: TVL - successfully executed on ${new Date().toISOString()}`,
    );
  } catch (e) {
    console.log(e);
  }
});

export { TVLCronJob };

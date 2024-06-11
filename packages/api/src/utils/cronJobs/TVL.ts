import { Predicate, TotalValueLocked } from '@src/models';
import { Asset, IConfVault, Vault } from 'bakosafe';
import cron from 'node-cron';
import { getAssetSlugByAssetId, getPriceUSD } from '../balance';

// Executa todos os dias a meia-noite
const TVLCronJob = cron.schedule('0 0 * * *', async () => {
  console.log('[TVL CRON JOB] running');
  try {
    //Validação para limitar apenas um registro diário
    const savedTVL = await TotalValueLocked.createQueryBuilder('tvl')
      .where('DATE(tvl.created_at) = CURRENT_DATE')
      .select(['tvl.id'])
      .getOne();

    if (savedTVL) {
      console.log('[TVL CRON JOB] has already been executed on the current date');
      return;
    }

    // Busca dados de todos os vaults
    const predicates = await Predicate.createQueryBuilder('p')
      .leftJoinAndSelect('p.version', 'version')
      .select(['p.id', 'p.configurable', 'version.code'])
      .where("p.configurable::jsonb ->> 'network' NOT LIKE :network", {
        network: '%localhost%',
      })
      .andWhere('version.name NOT LIKE :fakeName', {
        fakeName: '%fake_name%',
      })
      .getMany();

    const vaultsBalance = [];

    for await (const predicate of predicates) {
      const configurable: IConfVault = {
        ...JSON.parse(predicate.configurable),
      };

      // Instancia cada vault
      const vault = await Vault.create({
        configurable,
        version: predicate.version.code,
      });

      // Obtém os balances de cada vault e adiciona no array de balances
      const balances = await vault.getBalances();
      vaultsBalance.push(...balances);
    }

    const assetsTVL = await Asset.assetsGroupById(
      vaultsBalance.map(item => ({ ...item, amount: item.amount.format() })),
    );
    const formattedAssetsTVL = await Promise.all(
      Object.entries(assetsTVL)
        // Filtro para considerar apenas assets existentes no dicionário
        .filter(([assetId, amount]) => {
          const assetSlug = getAssetSlugByAssetId(assetId);
          return assetSlug !== undefined;
        })
        .map(async ([assetId, amount]) => {
          const assetSlug = getAssetSlugByAssetId(assetId);
          const formattedAmount = amount.format();
          const priceUSD = await getPriceUSD(assetSlug);

          return {
            assetId,
            amount: formattedAmount,
            amountUSD: Number((parseFloat(formattedAmount) * priceUSD).toFixed(2)),
          };
        }),
    );

    // Salva cada item no BD
    for await (const formattedAssetTVL of formattedAssetsTVL) {
      await TotalValueLocked.create({
        assetId: formattedAssetTVL.assetId,
        amount: formattedAssetTVL.amount,
        amountUSD: formattedAssetTVL.amountUSD,
      }).save();
    }

    console.log(
      `[TVL CRON JOB] successfully executed on ${new Date().toISOString()}`,
    );
  } catch (e) {
    console.log(e);
  }
});

export { TVLCronJob };

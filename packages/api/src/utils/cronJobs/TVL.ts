import { Predicate, TotalValueLocked } from '@src/models';
import { IConfVault, Vault } from 'bakosafe';
import { BN, bn } from 'fuels';
import cron from 'node-cron';
import axios from 'axios';

const assetId =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

// Executa todos os dias a meia-noite
const TVLCronJob = cron.schedule('0 0 * * *', async () => {
  console.log('[TVL CRON JOB] running');
  try {
    //Validação para limitar apenas um registro diário por assetId
    const savedTVL = await TotalValueLocked.createQueryBuilder('tvl')
      .where('tvl.assetId = :assetId', { assetId })
      .andWhere('DATE(tvl.created_at) = CURRENT_DATE')
      .select(['tvl.id'])
      .getOne();

    if (savedTVL) {
      console.log('[TVL CRON JOB] has already been executed on the current date');
      return;
    }

    // Busca dados de todos os vaults
    const predicates = await Predicate.createQueryBuilder('p')
      .leftJoinAndSelect('p.version', 'version')
      .where("p.configurable::jsonb ->> 'network' NOT LIKE :network", {
        network: '%localhost%',
      })
      .select(['p.id', 'p.configurable', 'version.code'])
      .getMany();

    let tvl: BN = bn(0);

    for await (const predicate of predicates) {
      const configurable: IConfVault = {
        ...JSON.parse(predicate.configurable),
      };

      // Instancia cada vault
      const vault = await Vault.create({
        configurable,
        version: predicate.version.code,
      });

      // Obtem o balance de cada predicate e soma balance de todos os predicates
      const balance = await vault.getBalance();
      tvl = tvl.add(balance);
    }

    const convert = `ETH-USD`;

    // Obtem cotação ETH-USD
    const priceUSD: number = await axios
      .get(`https://economia.awesomeapi.com.br/last/${convert}`)
      .then(({ data }) => {
        return data[convert.replace('-', '')].bid ?? 0.0;
      })
      .catch(e => {
        console.log('[TVL_USD_REQUEST_ERROR]: ', e);
        return 0.0;
      });

    // Converte o valor somado de todos os predicates para USD
    const amount = tvl.format().toString();
    const amountUSD = Number((parseFloat(amount) * priceUSD).toFixed(2));

    // Salva no BD
    await TotalValueLocked.create({
      assetId,
      amount,
      amountUSD,
    }).save();

    console.log(
      `[TVL CRON JOB] successfully executed on ${new Date().toISOString()}`,
    );
  } catch (e) {
    console.log(e);
  }
});

export { TVLCronJob };

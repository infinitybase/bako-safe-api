import glob from 'glob';
import path from 'path';

import { SeedsMonitor } from '@src/models/SeedsMonitor';
import Bootstrap from '@src/server/bootstrap';

const runSeeders = async () => {
  await Bootstrap.connectDatabase();
  const files = glob.sync(`${__dirname}/**/*.{js,ts}`);

  const seeders: string[] = [];
  files
    .filter(file => !file.includes('index'))
    .filter(async file => {
      const filename = file.replace(__dirname, '');
      !!(await SeedsMonitor.find({
        where: {
          filename,
        },
      }));
    });

  for (const file of files.filter(file => !file.includes('index'))) {
    const filename = file.replace(__dirname, '');
    const r = await SeedsMonitor.findOne({
      where: {
        filename,
      },
    });

    !r ? seeders.push(file) : null;
  }

  for (const seeder of seeders) {
    const [, seedName] = seeder.split('seeders');
    const seed = await import(path.resolve(seeder));
    await seed.default();
    await SeedsMonitor.create({
      filename: seedName,
    }).save();
  }
};

export default runSeeders;

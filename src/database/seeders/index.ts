import glob from 'glob';
import path from 'path';

import Bootstrap from '@src/server/bootstrap';

const runSeeders = async () => {
  await Bootstrap.connectDatabase();
  const files = glob.sync(`${__dirname}/**/*.{js,ts}`);
  const seeders = files.filter(file => !file.includes('index'));

  for (const seeder of seeders) {
    const [, seedName] = seeder.split('seeders');
    const seed = await import(path.resolve(seeder));
    await seed.default();
    console.log('[SEEDERS] Seed runned: ', seedName);
  }
};

export default runSeeders;

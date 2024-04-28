import { createConnection, getConnection } from 'typeorm';

import config from '../config/database';

const startConnection = async () => {
  try {
    return getConnection();
  } catch (e) {
    return await createConnection(config);
  }
};

export const disconnect = async () => {
  await getConnection().close();
};

export default startConnection;

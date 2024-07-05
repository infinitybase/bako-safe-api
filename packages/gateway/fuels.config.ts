import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  contracts: ['./tests/utils/sway/contract'],
  providerUrl: process.env.FUEL_PROVIDER,
  privateKey: process.env.PRIVATE_KEY,
  output: './tests/utils/contract',
});

// 5ec3411235e52c1ef9520fb4944c650dcb6c0bb2add89bfde3be6505622d76d97fe6054d9701bf63a2b8ffdb73075969e48ea0fc4d1d52b54138f3588bb67aa3c7e85b784c923a1a534a4bb0f350e1ed
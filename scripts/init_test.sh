#database instance for testing
yarn database:test

#give a timeout and run migrations
sleep 5

#run jest tests
NODE_ENV=test node  --experimental-vm-modules ./node_modules/jest/bin/jest.js
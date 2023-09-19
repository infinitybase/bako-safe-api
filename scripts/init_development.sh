#database instance for testing
yarn database:dev

#give a timeout and run migrations
sleep 5 && yarn migration:run

#run jest tests
node --experimental-vm-modules ./node_modules/jest/bin/jest.js


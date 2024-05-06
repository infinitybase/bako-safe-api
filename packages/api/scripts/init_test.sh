sleep 20

echo "Running api..."
pnpm api:run:dev &

DEV_PID=$!

sleep 5

echo "Running tests..."
NODE_ENV=test node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand

exit 0


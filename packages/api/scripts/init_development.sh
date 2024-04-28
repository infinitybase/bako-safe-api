#database instance for testing
pnpm database:dev

#give a timeout and run migrations
sleep 5 && pnpm migration:run



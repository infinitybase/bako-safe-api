module.exports = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: false,
  entities: ['./src/models/**/*.ts'],
  migrations: ['./src/database/migrations/**/*.ts'],
  cli: {
    entitiesDir: './src/models/',
    migrationsDir: './src/database/migrations/',
  },
};

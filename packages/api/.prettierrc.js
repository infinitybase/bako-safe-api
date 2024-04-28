module.exports = {
  semi: true,
  singleQuote: true,
  printWidth: 84,
  useTabs: false,
  tabWidth: 2,
  trailingComma: 'all',
  arrowParens: 'avoid',

  // @trivago/prettier-plugin-sort-imports
  importOrder: [
    '^@src/(.*)$',
    '^@config/(.*)$',
    '^@database/(.*)$',
    '^@models/(.*)$',
    '^@middlewares/(.*)$',
    '^@modules/(.*)$',
    '^@utils/(.*)$',
    '^[./]', // ./styles, ./types, ./anything
  ],
  importOrderSeparation: true,
};

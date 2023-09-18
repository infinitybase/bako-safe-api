module.exports = {
  roots: ['<rootDir>/src'],
  //testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',
  moduleFileExtensions: ['ts', 'js'],
  transform: { '\\.ts$': ['ts-jest'] },
  moduleNameMapper: {
    '@src/(.*)': '<rootDir>/src/$1',
    '@models/(.*)': '<rootDir>/src/models/$1',
    '@middlewares/(.*)': '<rootDir>/src/middlewares/$1',
    '@modules/(.*)': '<rootDir>/src/modules/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
  },
};

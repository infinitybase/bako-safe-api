import {
  CliAuthStrategy,
  CodeAuthStrategy,
  TokenAuthStrategy,
  ConnectorAuthStrategy,
  AuthStrategy,
} from './strategies';

export class AuthStrategyFactory {
  static createStrategy(signature: string): AuthStrategy {
    if (signature.startsWith('cli')) {
      return new CliAuthStrategy();
    }

    if (signature.startsWith('code')) {
      return new CodeAuthStrategy();
    }

    if (signature.startsWith('connector')) {
      return new ConnectorAuthStrategy();
    }

    return new TokenAuthStrategy();
  }
}

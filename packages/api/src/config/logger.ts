import pino from 'pino';

const { NODE_ENV, LOG_LEVEL } = process.env;

const isDevelopment = NODE_ENV === 'development';

const pinoConfig: pino.LoggerOptions = {
  level: LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  timestamp: pino.stdTimeFunctions.isoTime,

  // Sensitive data redaction for LGPD, GDPR, PCI DSS, SOC 2 Type II compliance
  redact: {
    paths: [
      // ===== Authentication & Authorization =====
      'password',
      '*.password',
      'token',
      '*.token',
      'authorization',
      '*.authorization',
      'headers.authorization',
      'apiKey',
      '*.apiKey',
      'api_key',
      '*.api_key',
      'accessToken',
      '*.accessToken',
      'refreshToken',
      '*.refreshToken',

      // ===== Cryptography & Keys (12 terms) =====
      'privateKey',
      '*.privateKey',
      'private_key',
      '*.private_key',
      'seed',
      '*.seed',
      'mnemonic',
      '*.mnemonic',
      'signature',
      '*.signature',
      'signedMessage',
      '*.signedMessage',

      // ===== Blockchain & Fuel (10 terms) =====
      'wallet',
      '*.wallet',
      'walletAddress',
      '*.walletAddress',
      'predicateAddress',
      '*.predicateAddress',
      'vault.configurable',
      'signer',
      '*.signer',
      'predicate_address',

      // ===== WebAuthn & Hardware Security (8 terms) =====
      'webauthn',
      '*.webauthn',
      'credentialId',
      '*.credentialId',
      'credential_id',
      '*.credential_id',
      'credentialPublicKey',
      '*.credentialPublicKey',

      // ===== Infrastructure & Endpoints (10 terms) =====
      'DATABASE_URL',
      'REDIS_URL',
      'connectionString',
      '*.connectionString',
      'connection_string',

      // ===== User Data & Recovery (14 terms) =====
      'code',
      '*.code',
      'recovery_code',
      '*.recovery_code',
      'pin',
      '*.pin',
      'email',
      '*.email',
      'phone',
      '*.phone',

      // ===== Transaction & Operation Data (11 terms) =====
      'operationData',
      '*.operationData',
      'operation_data',
      '*.operation_data',

      // ===== Network & Connectivity (3 terms) =====
      'ipAddress',
      'ip_address',
    ],
    remove: true,
  },

  // Development: human-readable output with pino-pretty
  // Production: JSON structured logging for centralized systems
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
};

export const logger = pino(pinoConfig);

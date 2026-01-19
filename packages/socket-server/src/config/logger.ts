import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

const pinoConfig = {
	level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

	// Sensitive data redaction for security compliance
	redact: {
		paths: [
			// Authentication & Authorization
			'password',
			'passwd',
			'pwd',
			'token',
			'accessToken',
			'refreshToken',
			'apiKey',
			'api_key',
			'apiSecret',
			'secretKey',
			'secret',
			'authorization',
			'auth',
			'*.authorization',
			'*.auth',
			'headers.authorization',

			// Cryptographic & Private Keys
			'privateKey',
			'private_key',
			'publicKey',
			'public_key',
			'mnemonic',
			'seed',
			'seedPhrase',
			'signature',
			'signedMessage',

			// User Sensitive Data
			'code',
			'recoveryCode',
			'pin',
			'otp',
			'sessionId',
			'session_id',
			'cookie',
			'cookies',
			'credentials',
			'email',
			'phone',
			'phoneNumber',
			'phone_number',

			// Blockchain Specific
			'privateAddress',
			'signer',
			'wallet',
			'walletAddress',
			'predicateAddress',
			'vault.configurable',
			'operationKey',
			'operationData',
			'apiToken',
			'api_token',
			'API_TOKEN',

			// Database & Server
			'databaseUrl',
			'DATABASE_URL',
			'database_url',
			'connectionString',
			'connection_string',
			'redisUrl',
			'REDIS_URL',
			'redis_url',
			'mongoUrl',
			'MONGO_URL',
			'mongo_url',
			'serverApi',
			'server_api',

			// Network & IP (semi-sensitive)
			'ipAddress',
			'ip_address',
		],
		remove: true,
	},

	// Pretty printing for development, JSON for production
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

	// Timestamp configuration
	timestamp: pino.stdTimeFunctions.isoTime,

	// Additional options for production
	...(!isDevelopment && {
		sync: false,
	}),
}

export const logger = pino(pinoConfig)

export default logger

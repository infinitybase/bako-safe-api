import pino from 'pino'

const { NODE_ENV, LOG_LEVEL } = process.env

const isDevelopment = NODE_ENV === 'development'

const pinoConfig: pino.LoggerOptions = {
	level: LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
	timestamp: pino.stdTimeFunctions.isoTime,

	// Sensitive data redaction for security compliance
	redact: {
		paths: [
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
			'headers.authorization',
			'code',
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
}

export const logger = pino(pinoConfig)

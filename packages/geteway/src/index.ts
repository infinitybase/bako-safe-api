import express from 'express'
import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { createHandler } from 'graphql-http/lib/use/express'
import expressPlayground from 'graphql-playground-middleware-express'
import { schemaFromExecutor } from '@graphql-tools/wrap'

const { PROVIDER } = process.env

async function main() {
	const app = express()
	app.use(express.json())

	// Middleware para logar as requisições
	const requestLoggingMiddleware = (req, res, next) => {
		const requestDetails = {
			method: req.method,
			url: req.url,
			headers: req.headers,
			body: req.body,
		}
		console.info('Solicitação recebida:', requestDetails)
		next()
	}

	// Configuração do executor HTTP para o GraphQL
	const executor = buildHTTPExecutor({
		endpoint: PROVIDER, // Certifique-se que PROVIDER é uma URL completa
	})

	// Criar o schema utilizando o executor
	const schema = await schemaFromExecutor(executor)

	// Aplicar o middleware de log antes das rotas
	app.use(requestLoggingMiddleware)

	app.get(
		'/graphql',
		expressPlayground({
			endpoint: '/graphql',
			settings: {
				'schema.polling.enable': false,
			},
		}),
	)

	app.post('/graphql', createHandler({ schema }))

	// Iniciar o servidor Express na porta 4001
	app.listen(4001, () => {
		console.log(`Servidor rodando em http://localhost:4001`)
	})
}

main()

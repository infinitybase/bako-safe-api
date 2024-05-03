import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { ApolloServer } from 'apollo-server-express'
import { schemaFromExecutor } from '@graphql-tools/wrap'
import express from 'express'

const { PROVIDER } = process.env

async function main() {
	const app = express()

	// Middleware para logar as requisições
	const requestLoggingMiddleware = (req, res, next) => {
		const requestDetails = {
			method: req.method,
			url: req.url,
			headers: req.headers,
			body: req.body,
		}
		console.info('Solicitação recebida:', requestDetails)
		next() // Correto: apenas 'next'
	}

	// Aplicar o middleware no Express
	app.use(requestLoggingMiddleware)

	// Configurar o executor HTTP para o endpoint do GraphQL
	const executor = buildHTTPExecutor({
		endpoint: PROVIDER, // Certifique-se que PROVIDER é uma URL completa
	})

	// Criar o schema utilizando o executor
	// Aguardar a promessa retornada por schemaFromExecutor
	const schema = await schemaFromExecutor(executor)

	// Instância do ApolloServer
	const server = new ApolloServer({
		schema,
		context: ({ req }) => ({
			headers: req.headers,
		}),
	})

	// Integrar o ApolloServer com o Express
	await server.start()
	server.applyMiddleware({ app })

	// Iniciar o servidor Express na porta 4000
	app.listen(4001, () => {
		console.log(`Servidor rodando em http://localhost:4001${server.graphqlPath}`)
	})
}

main()

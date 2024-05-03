/* eslint-disable @typescript-eslint/ban-ts-comment */
import express from 'express'
import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { createHandler } from 'graphql-http/lib/use/express'
import { schemaFromExecutor } from '@graphql-tools/wrap'

const { PROVIDER } = process.env

async function main() {
	const app = express()
	app.use(express.json())

	const executor = buildHTTPExecutor({
		endpoint: PROVIDER, // Certifique-se que PROVIDER é uma URL completa
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
	})

	const schema = await schemaFromExecutor(executor)
	const handler = createHandler({
		schema,
		//@ts-ignore
		execute({ schema, operationName, document, variableValues, ...rest }) {
			console.log('Executando a operação:', {
				operationName,
				// 	document,
				variableValues,
			})
			return executor({
				document,
				operationName,
				variables: variableValues,
				...rest,
			})
		},
	}) // Crie o handler uma única vez

	app.all('/graphql', async (req, res) => {
		try {
			// console.log(await parseRequestParams(req, res))
			return handler(req, res, err => {
				if (err) {
					console.error('Erro ao processar a requisição:', err)
					res.status(500).json({ error: 'Erro interno' })
				}
				console.log('Requisição processada com sucesso:', res.statusCode, res.statusMessage, res.body)
			})
		} catch (e) {
			console.error('Erro ao processar a requisição:', e)
			res.status(500).json({ error: 'Erro interno' })
		}
	}) // Use o handler para todas as requisições /graphql

	// app.get(
	// 	'/graphql',
	// 	expressPlayground({
	// 		endpoint: '/graphql',
	// 		settings: {
	// 			'schema.polling.enable': true,
	// 		},
	// 	}),
	// )

	app.listen(4001, () => {
		console.log(`Servidor rodando em http://localhost:4001`)
	})
}

main()

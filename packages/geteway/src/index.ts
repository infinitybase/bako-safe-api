/* eslint-disable @typescript-eslint/ban-ts-comment */
import express from 'express'
import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { createHandler } from 'graphql-http/lib/use/express'
import { schemaFromExecutor } from '@graphql-tools/wrap'
import expressPlayground from 'graphql-playground-middleware-express'

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
		async execute({ schema, operationName, document, variableValues, ...rest }) {
			const address = '0x6f31d6081bc4e90bb797bb89b9ec81f06e8ed5a6c4880f47746c7b03b772b4da'
			console.log('[REQ]: ', variableValues)
			const isValid = !!variableValues && !!variableValues.owner

			isValid &&
				console.log('Executando a operação:', {
					operationName,
					// 	document,
					variableValues: JSON.stringify({
						...variableValues,
						//...(isValid && { owner: address }),
					}),
				})

			const res = await executor({
				...rest,
				document,
				operationName,
				variables: {
					...variableValues,
					//...(isValid && { owner: address }),
				},
			})

			console.log('[RES]: ', res)
			return res
		},
	}) // Crie o handler uma única vez

	// app.use('/graphql', (req, res, next) => {
	// 	!!req && console.log('[REQ]', req.body)
	// 	next()
	// }) // Use o handler para todas as requisições /graphql

	app.post('/graphql', handler)

	// Check health of the graphql endpoint and the fuel provider
	app.get('/health', async (_, res) => {
		console.log('Checando a saúde do endpoint')
		let providerUp = null
		try {
			providerUp = (await fetch(`${PROVIDER.replace('/graphql', '/health')}`).then(res => res.json())).up
		} catch (_e) {
			providerUp = false
		}
		res.json({ up: providerUp })
	})

	app.get(
		'/graphql',
		() => {
			console.log('Acesso ao playground')
		},
		expressPlayground({
			endpoint: '/graphql',
		}),
	)

	app.listen(4001, () => {
		console.log(`Servidor rodando em http://localhost:4001`)
	})
}

main()

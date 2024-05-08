import { createConfig } from 'fuels'

const { GRAPHQL_PROVIDER, PRIVATE_KEY } = process.env

export default createConfig({
	contracts: ['./contract'],
	useBuiltinForc: false,
	providerUrl: 'http://localhost:4001/graphql',
	output: '../sdk/src/sway',
	privateKey: '0xa449b1ffee0e2205fa924c6740cc48b3b473aa28587df6dab12abc245d1f5298',
})

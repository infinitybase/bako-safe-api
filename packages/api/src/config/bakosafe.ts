export const bakoProviders = {
    SERVER_URL: process.env.API_URL,
    CLIENT_URL: process.env.UI_URL,
    CHAIN_URL: process.env.API_DEFAULT_NETWORK,
}

export const bakoGasFee = {
    GAS_LIMIT: Number(process.env.GAS_LIMIT) ?? 10000000,
    MAX_FEE: Number(process.env.MAX_FEE) ?? 1000000,
}
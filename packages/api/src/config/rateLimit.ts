const {
    API_URL
} = process.env;

export const rateLimitConf = {
    windowMs: 1000, // sec
    max: API_URL.includes('localhost') ? 100 : 100,
    message: 'You have exceeded the number of allowed requests. Please try again later.',
    headers: true, 
}
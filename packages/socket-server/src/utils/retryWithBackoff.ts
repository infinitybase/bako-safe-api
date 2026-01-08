const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type RetryOptions = {
	retries?: number
	baseDelay?: number
}

const DEFAULT_RETRIES = 3
const DEFAULT_BASE_DELAY = 400 // ms

/**
 * Executes an async function with retry attempts and exponential backoff for 5xx errors.
 *
 * - Retries only for HTTP 5xx errors (status >= 500 and < 600).
 * - The delay between attempts increases exponentially and includes random jitter.
 * - By default, tries up to 3 times and starts with a 500ms delay.
 * - Logs the url (if provided) on each retry attempt.
 *
 * @template T The return type of the async function
 * @param fn The async function to execute
 * @param url The url related to the request (for logging)
 * @param options.retries Maximum number of attempts (default: 3)
 * @param options.baseDelay Base delay in ms for exponential backoff (default: 400)
 * @returns The result of the async function if any attempt succeeds
 * @throws Rethrows the original error if not a 5xx error or if all attempts fail
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, url?: string, { retries = DEFAULT_RETRIES, baseDelay = DEFAULT_BASE_DELAY }: RetryOptions = {}): Promise<T> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			const status = error?.response?.status

			if (!status || status < 500 || status >= 600) {
				throw error
			}

			if (attempt === retries) {
				throw error
			}

			const jitter = Math.random() * 100
			const delay = baseDelay * Math.pow(2, attempt) + jitter

			console.warn(`[RETRY] Attempt ${attempt + 1}/${retries + 1} failed (status ${status})${url ? ` for URL: ${url}` : ''}. Retrying in ${Math.round(delay)}ms...`)

			await sleep(delay)
		}
	}
}

export { retryWithBackoff }

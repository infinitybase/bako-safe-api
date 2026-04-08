export const QUEUE_SUBMIT_TRANSACTION = "QUEUE_SUBMIT_TRANSACTION";
export const MAX_ATTEMPTS = 120;
export const BACKOFF_STEP_MS = 5000; // +5s per attempt
export const BACKOFF_CYCLE = 5; // resets every 5 attempts
// 24 cycles x 75s (5+10+15+20+25) = 1800s = ~30 minutes total

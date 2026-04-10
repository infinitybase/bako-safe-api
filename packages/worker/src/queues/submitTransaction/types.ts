export type QueueSubmitTransaction = {
  hash: string;
  transactionId: string;
  apiUrl: string;
  networkUrl: string;
  txData: any;
  resume: any;
  predicateConfigurable: string;
  predicateVersion: string;
};

export type RetryAttemptEntry = {
  error: string | null;
  first_attempt: number;
  last_attempt: number;
  count: number;
  first_timestamp: string;
  last_timestamp: string;
  avg_duration_ms: number;
};

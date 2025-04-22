export const ETH =
  "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07";

export const TRANSACTION_STATUS = {
  Success: 1,
  Failed: 3,
};

export const PRIORITY = {
  IMMEDIATELY: 1,
  ACTIVE: 2,
  INACTIVE: 3,
};

export const TTL_CONFIG = {
  IMMEDIATELY: 1,
  ACTIVE: 60 * 1,
  INACTIVE: 60 * 60 * 6,
  RECENTLY_UPDATED: 60 * 5,
  MODERATELY_UPDATED: 60 * 30,
};

export const TRANSACTION_TYPE = {
  DEPOSIT: "DEPOSIT"
};

export const QUEUE_DEPOSIT = "QUEUE_DEPOSIT";
export const CRON_EXPRESSION = "0/30 * * * * *";
export const INITIAL_DELAY = 6 * 1000 * 1;

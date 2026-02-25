export interface QueueUserBlockSync {
  user_id: string;
  user_address: string;
  predicates: string[]; // List of predicate addresses for this user
  last_login: number; // Timestamp of last login for priority sorting
}

export interface QueueUserLogoutSync {
  user_id: string;
  last_block: number;
  predicates: string[];
}

export interface UserBlockState {
  user_id: string;
  last_block: number;
  last_sync: number; // Timestamp
  predicates_synced: string[];
}

export interface LoggedUser {
  user_id: string;
  user_address: string;
  last_login: number;
  predicates: string[];
}

export interface HypersyncResponse {
  data: HypersyncTransaction[];
  next_block: number;
}

export interface HypersyncTransaction {
  tx_id: string;
  block_height: number;
  time: number;
  status: number;
  inputs: HypersyncInput[];
  outputs: HypersyncOutput[];
}

export interface HypersyncInput {
  tx_id: string;
  owner: string;
  amount: string;
  asset_id: string;
  input_type: number;
  recipient?: string;
}

export interface HypersyncOutput {
  tx_id: string;
  to: string;
  amount: string;
  asset_id: string;
  output_type: number;
}

export interface BlockSyncResult {
  user_id: string;
  blocks_processed: number;
  transactions_found: number;
  current_block: number;
  reached_tip: boolean;
}

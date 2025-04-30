import { Predicate } from "fuels";

export type Input = {
    tx_id: string;
    tx_status: number;
    owner: string;
    asset_id: string;
    witness_index?: number;
    input_type?: number;
    amount?: string;
    utxo_id?: string;
};

export type Output = {
    tx_id: string;
    tx_status: number;
    tx_type: number;
    output_type: number;
    to: string;
    amount: string;
    asset_id: string;
};

export type Transaction = {
    id: string;
    block_height: number;
    time: number;
    status: number;
};

export type Block = {
    id: string;
    time: number;
    height: number;
}

export type PredicateDeposit = {
    inputs: Input[];
    outputs: Output[];
    transactions: Transaction[];
    blocks: Block[];
}

export type PredicateQueue = {
    id: string;
    name: string;
    predicate_address: string;
    configurables: object;
    owner_id: string;
    token_user_id: string;
    token: string;
}

export type PredicateDepositQuery = {
    data: PredicateDeposit[];
    archive_height: number;
    next_block: number;
    total_execution_time: number;
}

export type QueueDeposit = {
    predicate: PredicateQueue;
}

export type PredicateDepositTx = {
    id?: string;
    input: Input;
    output: Output;
    transaction?: Transaction;
    block?: Block;
}

export type PredicateDepositData = {
    predicateId: string;
    hash: string;
    status: string;
    sendTime: Date;
    gasUsed: string;
    resume: object;
    created_at: Date;
    updated_at: Date;
    summary: {
        type: string;
        operations: any[];
    };
    type: string;
    network?: string;
}

export type PredicateDepositGrouped = PredicateDepositData[] | null;

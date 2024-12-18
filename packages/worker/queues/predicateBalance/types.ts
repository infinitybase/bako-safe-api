export type Input = {
    tx_id: string;
    owner: string;
    amount: string;
    asset_id: string;
    input_type: number;
    recipient: string;
};

export type Output = {
    tx_id: string;
    to: string;
    amount: string;
    asset_id: string;
    output_type: number;
};

export type Transaction = {
    id: string;
    block_height: number;
    time: number;
    status: number;
};

export type Block = {
    time: number;
    height: number;
}

export type PredicateBalance = {
    inputs: Input[];
    outputs: Output[];
    transactions: Transaction[];
    blocks: Block[];
}

export type PredicateBalanceQuery = {
    data: PredicateBalance[];
    archive_height: number;
    next_block: number;
    total_execution_time: number;
}

export type QueueBalance = {
    predicate_address: string;
}

export type PredicateBalanceTx = { inputs: Input[]; outputs: Output[], time: Date}

export type PredicateBalanceGrouped = {
    [tx_id: string]: PredicateBalanceTx;
}
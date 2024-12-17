import { TRANSACTION_STATUS } from "../constants";
import type { PredicateBalance, PredicateBalanceGrouped, PredicateBalanceTx } from "../types";

export function groupByTransaction(data: PredicateBalance[]): PredicateBalanceGrouped {
    const groupedData: Record<string, PredicateBalanceTx> = {};
    const groupedBlocks: Record<string, Date> = {};

    for (const block of data) {
        for (const _block of block.blocks){
            if (!groupedBlocks[_block.height]) {
                groupedBlocks[_block.height] = new Date(_block.time * 1000);
            }
        }

        //inputs
        for (const input of block.inputs) {
            if (!groupedData[input.tx_id]) {
                groupedData[input.tx_id] = { inputs: [], outputs: [], time: new Date() };
            }
            groupedData[input.tx_id].inputs.push(input);
        }
    
        //outputs
        for (const output of block.outputs) {
            if (!groupedData[output.tx_id]) {
                groupedData[output.tx_id] = { inputs: [], outputs: [], time: new Date() };
            }
            groupedData[output.tx_id].outputs.push(output);
        }

        // blocks
        for (const tx of block.transactions) {
            if(tx.status === TRANSACTION_STATUS.Failed){
                delete groupedData[tx.id];
            }else{
                groupedData[tx.id] = { ...groupedData[tx.id], time: groupedBlocks[tx.block_height] };
            }
        }
    }

    return groupedData;
}

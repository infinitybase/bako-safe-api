import { Database } from "../../utils/database";
import balanceQueue from "./queue";
import cron from "node-cron";
import { EX_EXP, QUEUE_BALANCE } from "./constants";
import { predicates_list } from "../../mocks/predicates";

const fn = async () => {
    try {
        const db = await Database.connect();
        const predicates = await db.query(
            `SELECT predicate_address 
             FROM predicates`
        );

        // const predicates = predicates_list("PROD");
        
        console.log(`[${QUEUE_BALANCE}] Scheduling ${predicates.length} predicates...`);
        for (const p of predicates) {
            await balanceQueue.add(
                {
                    predicate_address: p.predicate_address,
                },
                {
                    attempts: 3,
                    backoff: 5000,
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );
        }
        console.log(`[${QUEUE_BALANCE}] Finished processing scheduler.`);
    } catch (error) {
        console.error(`[${QUEUE_BALANCE}] Error on scheduling:`, error);
    }
};

export const startBalanceCron = () => {
    console.log(`[${QUEUE_BALANCE}] Starting scheduler...`);

    // 1st execution -> 60 seconds after start
    setTimeout(() => {
        console.log(`[${QUEUE_BALANCE}] Executing first task...`);
        fn();
    }, 60 * 1000 * 1)

    // Agendamento do cron
    cron.schedule(EX_EXP, async () => {
        console.log(`[${QUEUE_BALANCE}] Executing scheduled task...`);
        await fn();
    });
};
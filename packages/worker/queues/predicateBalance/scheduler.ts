import { Database } from "../../utils/database";
import balanceQueue from "./queue";
import cron from "node-cron";
import { EX_EXP } from "./constants";

export const fn = async () => {
    try {
        console.log('[SCHEDULER] Starting...');
        const db = await Database.connect();
        const predicates = await db.query(
            `SELECT predicate_address 
             FROM predicates`
        );
        
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
        console.log('[SCHEDULER] Finished processing.');
    } catch (error) {
        console.error('[SCHEDULER] Error:', error);
    }
};

export const startBalanceScheduler = () => {
    console.log('[CRON] Starting scheduler...');

    // 1st execution
    fn();

    // Agendamento do cron
    cron.schedule(EX_EXP, async () => {
        console.log('[CRON] Executing scheduled task...');
        await fn();
    });
};
import { Database } from "../../utils/database";
import balanceQueue from "./queue";
import cron from "node-cron";
import { predicates } from '../../mocks/predicates';

const EX_EXP = '0 8,20 * * *';

export const fn = async () => {
    try {
        console.log('[SCHEDULER] Starting...');
        const db = await Database.connect();
        // const predicates = await db.query(
        //     `SELECT predicate_address 
        //      FROM predicates`
        // );
        const pr = predicates("PROD");

        console.log('[predicates]: ', pr.length);
        
        for (const p of pr) {
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

export const startScheduler = () => {
    console.log('[CRON] Starting scheduler...');
    
    // // Executa imediatamente a tarefa
    // fn()
    //     .catch(error => console.error('[CRON] Immediate execution error:', error));

    // Agendamento do cron
    cron.schedule(EX_EXP, async () => {
        console.log('[CRON] Executing scheduled task...');
        await fn();
    });
};

startScheduler();

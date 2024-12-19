import assetQueue from "./queue";
import cron from "node-cron";
import { EX_EXP, QUEUE_ASSET } from "./constants";

const fn = async () => {
    console.log(`[${QUEUE_ASSET}] Scheduler...`);
            await assetQueue.add({}, 
                {
                    attempts: 3,
                    backoff: 5000,
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );

    console.log(`[${QUEUE_ASSET}] Finished processing scheduler.`);
};

export const startAssetsCron = () => {
    console.log(`[${QUEUE_ASSET}] Starting scheduler...`);

    // 1st execution
    fn();

    // Agendamento do cron
    cron.schedule(EX_EXP, async () => {
        console.log(`[${QUEUE_ASSET}] Executing scheduled task...`);
        await fn();
    });
};
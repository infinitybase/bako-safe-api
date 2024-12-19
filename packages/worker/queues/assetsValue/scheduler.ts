import assetQueue from "./queue";
import cron from "node-cron";
import { EX_EXP } from "./constants";

export const fn = async () => {
            await assetQueue.add({}, 
                {
                    attempts: 3,
                    backoff: 5000,
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );
};

export const startAssetsCron = () => {
    console.log('[CRON] Starting scheduler...');

    // 1st execution
    fn();

    // Agendamento do cron
    cron.schedule(EX_EXP, async () => {
        console.log('[CRON] Executing scheduled task...');
        await fn();
    });
};
import app from './app';
import { connectRedis } from './config/redis';
import { startTieredSyncJobs } from './jobs/dailySync.job';
import { startDisputeCheck } from './jobs/disputeCheck.job';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    await connectRedis();

    // Start background autonomous ingestion
    startTieredSyncJobs();
    startDisputeCheck();

    app.listen(PORT, () => {
        console.log(`Backend server running tightly on port ${PORT}`);
    });
}

bootstrap().catch(console.error);

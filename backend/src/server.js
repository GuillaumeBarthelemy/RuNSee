import "dotenv/config";
import app from "./app.js";
import env from "./config/env.js";
import { startAutoIncrementalSyncScheduler } from "./services/sync/autoSync.service.js";
import { recoverActiveSyncJobsOnStartup } from "./services/sync/syncJob.service.js";
import { startAutoGarminRecoverySyncScheduler } from "./services/providers/garminRecoveryAutoSync.service.js";

app.listen(env.appPort, env.appHost, () => {
  console.log(`RuNSee backend local: ${env.localApiUrl}`);
  console.log(`RuNSee backend public: ${env.publicApiUrl}`);

  recoverActiveSyncJobsOnStartup().catch((error) => {
    console.error("Failed to recover active sync jobs on startup:", error);
  });

  startAutoIncrementalSyncScheduler();
  startAutoGarminRecoverySyncScheduler();
});

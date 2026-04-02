-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaConnection" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "stravaAthleteId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "grantedScopes" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTokenRefreshAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "stravaAthleteId" TEXT NOT NULL,
    "username" TEXT,
    "firstname" TEXT,
    "lastname" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "sex" TEXT,
    "profileMediumUrl" TEXT,
    "profileUrl" TEXT,
    "rawJson" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "stravaActivityId" TEXT NOT NULL,
    "resourceState" INTEGER,
    "externalId" TEXT,
    "uploadId" TEXT,
    "name" TEXT,
    "description" TEXT,
    "type" TEXT,
    "sportType" TEXT,
    "workoutType" INTEGER,
    "startDate" TIMESTAMP(3),
    "startDateLocal" TIMESTAMP(3),
    "timezone" TEXT,
    "utcOffset" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "movingTime" INTEGER,
    "elapsedTime" INTEGER,
    "totalElevationGain" DOUBLE PRECISION,
    "startLatlngJson" TEXT,
    "endLatlngJson" TEXT,
    "achievementCount" INTEGER,
    "kudosCount" INTEGER,
    "commentCount" INTEGER,
    "athleteCount" INTEGER,
    "photoCount" INTEGER,
    "prCount" INTEGER,
    "totalPhotoCount" INTEGER,
    "trainer" BOOLEAN,
    "commute" BOOLEAN,
    "manual" BOOLEAN,
    "private" BOOLEAN,
    "flagged" BOOLEAN,
    "averageSpeed" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "averageCadence" DOUBLE PRECISION,
    "averageWatts" DOUBLE PRECISION,
    "weightedAverageWatts" INTEGER,
    "kilojoules" DOUBLE PRECISION,
    "deviceWatts" BOOLEAN,
    "hasHeartrate" BOOLEAN,
    "averageHeartrate" DOUBLE PRECISION,
    "maxHeartrate" DOUBLE PRECISION,
    "averageTemp" INTEGER,
    "sufferScore" INTEGER,
    "calories" DOUBLE PRECISION,
    "mapId" TEXT,
    "mapSummaryPolyline" TEXT,
    "mapPolyline" TEXT,
    "gearId" TEXT,
    "isDetailed" BOOLEAN NOT NULL DEFAULT false,
    "summaryJson" TEXT,
    "rawJson" TEXT,
    "summaryFetchedAt" TIMESTAMP(3),
    "detailsFetchedAt" TIMESTAMP(3),
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'legacy',
    "status" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL DEFAULT 'ui',
    "message" TEXT,
    "errorDetails" TEXT,
    "progressPercent" INTEGER,
    "pagesProcessed" INTEGER NOT NULL DEFAULT 0,
    "activitiesSeen" INTEGER NOT NULL DEFAULT 0,
    "activitiesInserted" INTEGER NOT NULL DEFAULT 0,
    "activitiesUpdated" INTEGER NOT NULL DEFAULT 0,
    "activitiesFailed" INTEGER NOT NULL DEFAULT 0,
    "detailsFetched" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedActivityDate" TIMESTAMP(3),
    "lastProcessedActivityId" TEXT,
    "requestedAfterEpoch" TEXT,
    "resultJson" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "cursorName" TEXT NOT NULL,
    "cursorValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StravaConnection_stravaAthleteId_key" ON "StravaConnection"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_connectionId_key" ON "Athlete"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_stravaAthleteId_key" ON "Athlete"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_stravaActivityId_key" ON "Activity"("stravaActivityId");

-- CreateIndex
CREATE INDEX "Activity_athleteId_startDate_idx" ON "Activity"("athleteId", "startDate");

-- CreateIndex
CREATE INDEX "SyncJob_status_queuedAt_idx" ON "SyncJob"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "SyncJob_jobType_queuedAt_idx" ON "SyncJob"("jobType", "queuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCursor_appUserId_cursorName_key" ON "SyncCursor"("appUserId", "cursorName");

-- AddForeignKey
ALTER TABLE "StravaConnection" ADD CONSTRAINT "StravaConnection_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StravaConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncCursor" ADD CONSTRAINT "SyncCursor_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

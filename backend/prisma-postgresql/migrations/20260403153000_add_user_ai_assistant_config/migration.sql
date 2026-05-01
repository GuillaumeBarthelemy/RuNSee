-- CreateTable
CREATE TABLE "UserAiAssistantConfig" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    "apiKeyEncrypted" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiAssistantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAiAssistantConfig_appUserId_key" ON "UserAiAssistantConfig"("appUserId");

-- AddForeignKey
ALTER TABLE "UserAiAssistantConfig" ADD CONSTRAINT "UserAiAssistantConfig_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

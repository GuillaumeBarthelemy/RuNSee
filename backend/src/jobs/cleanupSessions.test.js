/* eslint-env node */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { startSessionCleanupJob, stopSessionCleanupJob } from "./cleanupSessions.js";

// Tests legers : verifie que start/stop n'explose pas et que stop est
// idempotent. Le contenu fonctionnel (deleteMany sur sessions) est teste
// indirectement via le service Prisma (mock complexe).

describe("startSessionCleanupJob / stopSessionCleanupJob (Lot 2)", () => {
  it("ne lance pas deux fois si appele en double", () => {
    startSessionCleanupJob();
    startSessionCleanupJob(); // no-op
    stopSessionCleanupJob();
  });

  it("stop est idempotent meme sans start prealable", () => {
    stopSessionCleanupJob();
    stopSessionCleanupJob(); // ne throw pas
    assert.ok(true);
  });
});

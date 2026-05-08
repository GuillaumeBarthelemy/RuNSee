import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateGarminBackfillWindow,
  calculatePreviousGarminWindowEndDate,
  resolveGarminBackfillForceRun,
} from "./garminHistoricalBackfill.service.js";

describe("Garmin historical activity backfill windows", () => {
  it("builds the first 180-day window ending on the cursor date", () => {
    const window = calculateGarminBackfillWindow("2026-05-08T12:00:00.000Z", 180);

    assert.equal(window.startDate.toISOString().slice(0, 10), "2025-11-10");
    assert.equal(window.endDate.toISOString().slice(0, 10), "2026-05-08");
    assert.equal(window.windowDays, 180);
  });

  it("moves the next window end to the day before the previous window start", () => {
    const previousEnd = calculatePreviousGarminWindowEndDate("2025-11-10T00:00:00.000Z");
    const nextWindow = calculateGarminBackfillWindow(previousEnd, 180);

    assert.equal(previousEnd.toISOString().slice(0, 10), "2025-11-09");
    assert.equal(nextWindow.startDate.toISOString().slice(0, 10), "2025-05-14");
    assert.equal(nextWindow.endDate.toISOString().slice(0, 10), "2025-11-09");
  });

  it("denies forced windows unless the server setting explicitly allows them", () => {
    assert.equal(resolveGarminBackfillForceRun(true, false), false);
    assert.equal(resolveGarminBackfillForceRun(false, true), false);
    assert.equal(resolveGarminBackfillForceRun(true, true), true);
  });
});

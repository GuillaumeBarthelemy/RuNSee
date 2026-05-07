import { describe, expect, it } from "vitest";
import {
  buildTrailAnalyticsSummary,
  buildTrailContextSummary,
  buildTrailProfile,
} from "./trailProfile.js";

function makeActivity(overrides = {}) {
  return {
    distance: 10000,
    movingTime: 3600,
    totalElevationGain: 320,
    startDateLocal: "2026-05-07T08:00:00.000Z",
    rawJson: JSON.stringify({
      splits_metric: [
        { distance: 2500, moving_time: 900, elevation_difference: 120 },
        { distance: 2500, moving_time: 900, elevation_difference: -110 },
        { distance: 2500, moving_time: 900, elevation_difference: 130 },
        { distance: 2500, moving_time: 900, elevation_difference: -120 },
      ],
    }),
    ...overrides,
  };
}

describe("trailProfile", () => {
  it("classifie une sortie trail roulant avec D+ et D-", () => {
    const profile = buildTrailProfile(makeActivity());

    expect(profile.hasTrailContext).toBe(true);
    expect(profile.terrain.key).toBe("rolling_trail");
    expect(profile.elevationGain).toBe(250);
    expect(profile.elevationLoss).toBe(230);
    expect(profile.dataQuality.key).toBe("sufficient");
  });

  it("ne pollue pas une sortie route plate", () => {
    const profile = buildTrailProfile(makeActivity({
      totalElevationGain: 20,
      rawJson: JSON.stringify({
        splits_metric: [
          { distance: 5000, moving_time: 1000, elevation_difference: 5 },
          { distance: 5000, moving_time: 1000, elevation_difference: -4 },
        ],
      }),
    }));

    expect(profile.hasTrailContext).toBe(false);
    expect(profile.terrain.key).toBe("flat_road");
  });

  it("affiche un contexte Aujourd'hui seulement si utile", () => {
    const summary = buildTrailContextSummary([makeActivity()], {
      referenceDate: new Date("2026-05-07T12:00:00.000Z"),
    });

    expect(summary.shouldShow).toBe(true);
    expect(summary.context).toContain("Specificite trail");
  });

  it("aggrege une selection Analytics", () => {
    const summary = buildTrailAnalyticsSummary([makeActivity(), makeActivity({ distance: 5000 })]);

    expect(summary.hasData).toBe(true);
    expect(summary.trailActivities).toBe(2);
    expect(summary.elevationGain).toBeGreaterThan(0);
  });
});

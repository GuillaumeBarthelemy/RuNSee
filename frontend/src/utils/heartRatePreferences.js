const ZONE_METADATA = [
  { key: "z1", shortLabel: "Z1", label: "Z1 recuperation" },
  { key: "z2", shortLabel: "Z2", label: "Z2 endurance fondamentale" },
  { key: "z3", shortLabel: "Z3", label: "Z3 endurance active" },
  { key: "z4", shortLabel: "Z4", label: "Z4 seuil" },
  { key: "z5", shortLabel: "Z5", label: "Z5 intensif / VO2" },
];

const DEFAULT_ZONE_RATIOS = [0.7, 0.8, 0.87, 0.93];

export const HEART_RATE_OPTION_KEYS = {
  max: "heartRateMax",
  zone1: "heartRateZone1Max",
  zone2: "heartRateZone2Max",
  zone3: "heartRateZone3Max",
  zone4: "heartRateZone4Max",
};

export const HEART_RATE_ZONE_FIELDS = [
  { key: HEART_RATE_OPTION_KEYS.zone1, shortLabel: "Z1", label: "Z1 jusqu'a" },
  { key: HEART_RATE_OPTION_KEYS.zone2, shortLabel: "Z2", label: "Z2 jusqu'a" },
  { key: HEART_RATE_OPTION_KEYS.zone3, shortLabel: "Z3", label: "Z3 jusqu'a" },
  { key: HEART_RATE_OPTION_KEYS.zone4, shortLabel: "Z4", label: "Z4 jusqu'a" },
];

function toBpm(value) {
  const parsed = Math.round(Number(value || 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isStrictlyIncreasing(values = []) {
  for (let index = 1; index < values.length; index += 1) {
    if (!(values[index] > values[index - 1])) {
      return false;
    }
  }

  return true;
}

export function buildEstimatedZoneCeilings(maxHeartrate = 0) {
  const safeMaxHeartrate = toBpm(maxHeartrate);

  if (!safeMaxHeartrate) {
    return [0, 0, 0, 0];
  }

  return DEFAULT_ZONE_RATIOS.map((ratio) => Math.round(safeMaxHeartrate * ratio));
}

export function normalizeHeartRatePreferences(options = {}) {
  const maxHeartrate = toBpm(options?.[HEART_RATE_OPTION_KEYS.max]);
  const zoneCeilings = HEART_RATE_ZONE_FIELDS.map((field) => toBpm(options?.[field.key]));

  return {
    maxHeartrate,
    zoneCeilings,
    hasCustomMax: maxHeartrate > 0,
    hasAnyCustomZones: zoneCeilings.some((value) => value > 0),
    hasCompleteCustomZones: zoneCeilings.every((value) => value > 0),
  };
}

export function formatHeartRateZoneRange(minHeartrate = 0, maxHeartrate = 0) {
  if (!maxHeartrate) {
    return "";
  }

  if (minHeartrate <= 0) {
    return `jusqu'a ${maxHeartrate} bpm`;
  }

  return `${minHeartrate}-${maxHeartrate} bpm`;
}

function buildZoneDefinitions(zoneCeilings = [], maxHeartrate = 0) {
  const safeMaxHeartrate = toBpm(maxHeartrate);
  const safeCeilings = zoneCeilings.filter((value) => value > 0);

  if (!safeMaxHeartrate || safeCeilings.length !== 4) {
    return ZONE_METADATA.map((zone) => ({
      ...zone,
      minHeartrate: 0,
      maxHeartrate: 0,
      rangeLabel: "",
    }));
  }

  return ZONE_METADATA.map((zone, index) => {
    const minHeartrate = index === 0 ? 0 : safeCeilings[index - 1] + 1;
    const maxZoneHeartrate = index < safeCeilings.length ? safeCeilings[index] : safeMaxHeartrate;

    return {
      ...zone,
      minHeartrate,
      maxHeartrate: maxZoneHeartrate,
      rangeLabel: formatHeartRateZoneRange(minHeartrate, maxZoneHeartrate),
    };
  });
}

export function buildHeartRateZoneSummary(zones = []) {
  return zones
    .filter((zone) => zone?.rangeLabel)
    .map((zone) => `${zone.shortLabel} ${zone.rangeLabel}`)
    .join(" | ");
}

export function resolveHeartRateZoneConfig({ preferences = {}, estimatedMaxHeartrate = 0 } = {}) {
  const normalized = normalizeHeartRatePreferences(preferences);
  const fallbackMaxHeartrate = toBpm(estimatedMaxHeartrate);
  const resolvedMaxHeartrate = normalized.maxHeartrate || fallbackMaxHeartrate;
  const customZonesAreValid = normalized.hasCompleteCustomZones
    && resolvedMaxHeartrate > 0
    && isStrictlyIncreasing([...normalized.zoneCeilings, resolvedMaxHeartrate]);
  const zoneCeilings = customZonesAreValid
    ? normalized.zoneCeilings
    : buildEstimatedZoneCeilings(resolvedMaxHeartrate);
  const usingEstimatedMaxHeartrate = !normalized.hasCustomMax && fallbackMaxHeartrate > 0;
  const usingEstimatedZones = !customZonesAreValid && zoneCeilings.every((value) => value > 0);
  const hasInvalidCustomZones = normalized.hasAnyCustomZones && !customZonesAreValid;

  let estimationMessage = "";

  if (usingEstimatedMaxHeartrate && usingEstimatedZones) {
    estimationMessage = "FC max et zones estimees. Renseignez-les dans Administration pour personnaliser l'analyse.";
  } else if (usingEstimatedMaxHeartrate && customZonesAreValid) {
    estimationMessage = "FC max estimee, avec vos zones personnalisees. Renseignez votre FC max dans Administration pour figer cette base.";
  } else if (!usingEstimatedMaxHeartrate && usingEstimatedZones && normalized.hasCustomMax) {
    estimationMessage = hasInvalidCustomZones
      ? "FC max personnalisee, mais zones incompletes ou incoherentes. Le repli estime reste utilise tant que Z1 < Z2 < Z3 < Z4 < FC max n'est pas respecte."
      : "FC max personnalisee, mais zones non renseignees. Les zones estimees par defaut restent utilisees tant que vous ne les personnalisez pas.";
  } else if (!usingEstimatedMaxHeartrate && usingEstimatedZones && !normalized.hasCustomMax) {
    estimationMessage = "Zones non renseignees. L'application utilisera une estimation quand c'est necessaire et vous l'indiquera.";
  }

  return {
    maxHeartrate: resolvedMaxHeartrate,
    zones: buildZoneDefinitions(zoneCeilings, resolvedMaxHeartrate),
    zoneCeilings,
    hasCustomMax: normalized.hasCustomMax,
    hasCustomZones: customZonesAreValid,
    hasAnyCustomZones: normalized.hasAnyCustomZones,
    hasInvalidCustomZones,
    usingEstimatedMaxHeartrate,
    usingEstimatedZones,
    estimationMessage,
  };
}

export const EXTERNAL_PROVIDER_CODES = Object.freeze({
  STRAVA: "strava",
  GARMINCONNECT_UNOFFICIAL: "garminconnect_unofficial",
  GARMIN_OFFICIAL: "garmin_official",
});

export const EXTERNAL_PROVIDER_STATUSES = Object.freeze({
  DISCONNECTED: "disconnected",
  CONSENT_REQUIRED: "consent_required",
  CONNECTING: "connecting",
  MFA_REQUIRED: "mfa_required",
  CONNECTED: "connected",
  SYNCING: "syncing",
  EXPIRED: "expired",
  ERROR: "error",
});

export const EXTERNAL_PROVIDER_DATA_TYPES = Object.freeze({
  SLEEP: "sleep",
  HRV: "hrv",
  RESTING_HEART_RATE: "resting_heart_rate",
  STRESS: "stress",
  BODY_BATTERY: "body_battery",
  TRAINING_READINESS: "training_readiness",
  TRAINING_STATUS: "training_status",
  DAILY_HEART_RATE: "daily_heart_rate",
  ACTIVITY_DETAIL: "activity_detail",
  ACTIVITY_SPLITS: "activity_splits",
  ACTIVITY_ZONES: "activity_zones",
});

export const EXTERNAL_PROVIDER_DATA_QUALITIES = Object.freeze({
  COMPLETE: "complete",
  PARTIAL: "partial",
  ABSENT: "absent",
  ERROR: "error",
});

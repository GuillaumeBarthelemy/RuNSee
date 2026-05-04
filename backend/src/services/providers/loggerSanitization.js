const SENSITIVE_KEY_PATTERN = /password|passwd|secret|token|session|cookie|authorization|credential|mfa|verification|encrypted/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONG_TOKEN_PATTERN = /\b[A-Za-z0-9_-]{24,}\b/g;

function maskString(value) {
  return String(value || "")
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(LONG_TOKEN_PATTERN, "[redacted-token]");
}

export function sanitizeForLog(value, depth = 0) {
  if (value === null || typeof value === "undefined") {
    return value;
  }

  if (typeof value === "string") {
    return maskString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (depth >= 4) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeForLog(item, depth + 1),
      ]),
    );
  }

  return "[unserializable]";
}

export function sanitizeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name,
    message: sanitizeForLog(error.message),
    userMessage: sanitizeForLog(error.userMessage),
    httpStatus: error.httpStatus,
    code: sanitizeForLog(error.code),
    details: sanitizeForLog(error.details),
  };
}

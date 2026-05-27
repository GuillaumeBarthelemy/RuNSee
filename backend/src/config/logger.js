/**
 * Logger applicatif minimal — wrapper sur `console` aujourd'hui, point
 * d'entree unique pour migrer vers `pino` plus tard sans toucher aux 28+
 * sites d'appel dans le code.
 *
 * Niveaux : trace | debug | info | warn | error
 *
 * Niveau filtre par env.LOG_LEVEL (default 'info' en prod, 'debug' ailleurs).
 * Tout est emis sur stdout/stderr en JSON-ish ({ level, time, msg, ...ctx }).
 *
 * NB : sanitization des champs sensibles est de la responsabilite de
 * l'appelant ou du middleware d'erreur (Lot 1). Ce module logge tel quel.
 */

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };

function resolveLevel() {
  const raw = String(process.env.LOG_LEVEL || "").trim().toLowerCase();
  if (raw && LEVELS[raw] !== undefined) return LEVELS[raw];
  return (process.env.NODE_ENV || "development") === "production"
    ? LEVELS.info
    : LEVELS.debug;
}

const currentLevel = resolveLevel();

function emit(level, msg, ctx) {
  if (LEVELS[level] < currentLevel) return;
  const record = {
    level,
    time: new Date().toISOString(),
    msg: typeof msg === "string" ? msg : String(msg),
    ...(ctx && typeof ctx === "object" ? ctx : {}),
  };
  const line = JSON.stringify(record);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

const logger = {
  trace: (msg, ctx) => emit("trace", msg, ctx),
  debug: (msg, ctx) => emit("debug", msg, ctx),
  info:  (msg, ctx) => emit("info",  msg, ctx),
  warn:  (msg, ctx) => emit("warn",  msg, ctx),
  error: (msg, ctx) => emit("error", msg, ctx),
  child: (bindings = {}) => ({
    trace: (msg, ctx) => emit("trace", msg, { ...bindings, ...ctx }),
    debug: (msg, ctx) => emit("debug", msg, { ...bindings, ...ctx }),
    info:  (msg, ctx) => emit("info",  msg, { ...bindings, ...ctx }),
    warn:  (msg, ctx) => emit("warn",  msg, { ...bindings, ...ctx }),
    error: (msg, ctx) => emit("error", msg, { ...bindings, ...ctx }),
  }),
};

export default logger;

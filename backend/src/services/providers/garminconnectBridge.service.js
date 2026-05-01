import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import env from "../../config/env.js";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const BACKEND_ROOT = path.resolve(path.dirname(CURRENT_FILE), "../../..");
const GARMINCONNECT_BRIDGE_PATH = path.join(
  BACKEND_ROOT,
  "scripts",
  "providers",
  "garminconnect_bridge.py",
);
const MAX_STDERR_LENGTH = 1000;

function buildBridgeError(message, userMessage, httpStatus = 502, details = {}) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  error.details = details;
  return error;
}

function parseBridgePayload(rawPayload) {
  try {
    return JSON.parse(rawPayload);
  } catch (error) {
    throw buildBridgeError(
      "Invalid JSON response from Garmin bridge.",
      "La reponse Garmin est invalide. Reessaie plus tard.",
      502,
      { parserMessage: error.message },
    );
  }
}

function buildSanitizedStderr(stderr) {
  return String(stderr || "").trim().slice(-MAX_STDERR_LENGTH);
}

export function runGarminconnectBridge(payload = {}) {
  const pythonBin = String(env.garminconnectPythonBin || "python3").trim() || "python3";
  const timeoutMs = Number(env.garminconnectBridgeTimeoutMs || 60000);

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [GARMINCONNECT_BRIDGE_PATH], {
      cwd: BACKEND_ROOT,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGKILL");
      reject(
        buildBridgeError(
          "Garmin bridge timed out.",
          "Garmin ne repond pas assez vite. Reessaie dans quelques minutes.",
          504,
        ),
      );
    }, Math.max(15000, timeoutMs));

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(
        buildBridgeError(
          `Cannot start Garmin bridge: ${error.message}`,
          "Le connecteur Garmin n'est pas disponible cote serveur.",
          503,
        ),
      );
    });

    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (exitCode !== 0) {
        reject(
          buildBridgeError(
            `Garmin bridge exited with code ${exitCode}.`,
            "Le connecteur Garmin a echoue pendant la connexion.",
            502,
            { stderr: buildSanitizedStderr(stderr) },
          ),
        );
        return;
      }

      resolve(parseBridgePayload(stdout));
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

export async function loginGarminconnect({ email, password, mfaCode, mfaChallenge }) {
  return runGarminconnectBridge({
    operation: "login",
    email,
    password,
    mfaCode,
    mfaChallenge,
  });
}

export async function fetchGarminRecoveryDays({ session, dates = [] }) {
  return runGarminconnectBridge({
    operation: "fetch_recovery_days",
    session,
    dates,
  });
}

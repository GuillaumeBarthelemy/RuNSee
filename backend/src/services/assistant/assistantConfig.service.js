import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import prisma from "../../config/prisma.js";
import env from "../../config/env.js";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = "v1";
const IV_LENGTH = 12;
const DEFAULT_PROVIDER = "openai";

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function getDefaultModel() {
  return String(env.openaiDefaultModel || "gpt-4.1-mini").trim() || "gpt-4.1-mini";
}

export function isAiAssistantStorageReady() {
  return Boolean(String(env.aiAssistantEncryptionKey || "").trim());
}

function getEncryptionKey() {
  const rawValue = String(env.aiAssistantEncryptionKey || "").trim();

  if (!rawValue) {
    throw buildHttpError(
      "RUNSEE_AI_ASSISTANT_ENCRYPTION_KEY is not configured.",
      "Le stockage securise de l'assistant conversationnel n'est pas configure cote serveur.",
      503,
    );
  }

  return createHash("sha256").update(rawValue).digest();
}

function encryptValue(value) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value || ""), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptValue(payload) {
  const rawPayload = String(payload || "").trim();

  if (!rawPayload) {
    return "";
  }

  const [version, iv, authTag, encrypted] = rawPayload.split(".");

  if (version !== ENCRYPTION_VERSION || !iv || !authTag || !encrypted) {
    throw buildHttpError(
      "Unsupported encrypted AI assistant secret payload.",
      "La cle API stockee pour l'assistant conversationnel est invalide.",
      500,
    );
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function normalizeProvider(value) {
  const provider = String(value || DEFAULT_PROVIDER).trim().toLowerCase();
  return provider || DEFAULT_PROVIDER;
}

function validateProvider(value) {
  const provider = normalizeProvider(value);

  if (provider !== DEFAULT_PROVIDER) {
    throw buildHttpError(
      "Unsupported AI assistant provider.",
      "Seul OpenAI est pris en charge pour le moment.",
      400,
    );
  }

  return provider;
}

function validateModel(value) {
  const model = String(value || getDefaultModel()).trim();

  if (model.length < 3) {
    throw buildHttpError(
      "Invalid assistant model.",
      "Le modele OpenAI doit contenir au moins 3 caracteres.",
      400,
    );
  }

  if (model.length > 120) {
    throw buildHttpError(
      "Assistant model is too long.",
      "Le nom du modele OpenAI est trop long.",
      400,
    );
  }

  return model;
}

function normalizeApiKey(value) {
  return String(value || "").trim();
}

function validateApiKey(value) {
  const apiKey = normalizeApiKey(value);

  if (!apiKey) {
    throw buildHttpError(
      "Missing OpenAI API key.",
      "Une cle API OpenAI est requise pour activer l'assistant conversationnel.",
      400,
    );
  }

  if (apiKey.length < 20) {
    throw buildHttpError(
      "Invalid OpenAI API key.",
      "La cle API OpenAI semble incomplete.",
      400,
    );
  }

  return apiKey;
}

function normalizeSystemPrompt(value) {
  const prompt = String(value || "").trim();
  return prompt || null;
}

function validateSystemPrompt(value) {
  const prompt = normalizeSystemPrompt(value);

  if (prompt && prompt.length > 6000) {
    throw buildHttpError(
      "Assistant system prompt is too long.",
      "Le prompt systeme de l'assistant est trop long.",
      400,
    );
  }

  return prompt;
}

function serializeBaseAssistantConfig(config) {
  return {
    configured: Boolean(config?.apiKeyEncrypted),
    hasApiKey: Boolean(config?.apiKeyEncrypted),
    enabled: Boolean(config?.enabled),
    provider: normalizeProvider(config?.provider),
    model: config?.model || getDefaultModel(),
    systemPrompt: config?.systemPrompt || "",
    createdAt: config?.createdAt || null,
    updatedAt: config?.updatedAt || null,
    storageReady: isAiAssistantStorageReady(),
  };
}

async function findUserAiAssistantConfig(appUserId, { tx = prisma } = {}) {
  if (!appUserId) {
    return null;
  }

  return tx.userAiAssistantConfig.findUnique({
    where: {
      appUserId,
    },
  });
}

async function runInTransaction(tx, callback) {
  if (typeof tx?.$transaction === "function") {
    return tx.$transaction(callback);
  }

  return callback(tx || prisma);
}

export function serializeAiAssistantForAuthUser(config) {
  return serializeBaseAssistantConfig(config);
}

export async function getUserAiAssistantConfigSummary(appUserId, { tx = prisma } = {}) {
  const config = await findUserAiAssistantConfig(appUserId, { tx });
  return serializeBaseAssistantConfig(config);
}

export async function resolveUserAiAssistantConfigForChat(appUserId, { tx = prisma } = {}) {
  if (!appUserId) {
    throw buildHttpError(
      "App user id is required.",
      "Connecte-toi pour utiliser l'assistant conversationnel.",
      401,
    );
  }

  const config = await findUserAiAssistantConfig(appUserId, { tx });

  if (!config?.apiKeyEncrypted) {
    throw buildHttpError(
      "No AI assistant configuration was found for the current user.",
      "Configure d'abord l'assistant conversationnel dans Administration.",
      412,
    );
  }

  if (!config.enabled) {
    throw buildHttpError(
      "AI assistant is disabled for the current user.",
      "L'assistant conversationnel est desactive dans Administration.",
      412,
    );
  }

  return {
    ...config,
    apiKey: decryptValue(config.apiKeyEncrypted),
  };
}

export async function upsertUserAiAssistantConfig(
  appUserId,
  payload = {},
  { tx = prisma } = {},
) {
  if (!appUserId) {
    throw buildHttpError(
      "App user id is required.",
      "Connecte-toi pour configurer l'assistant conversationnel.",
      401,
    );
  }

  if (!isAiAssistantStorageReady()) {
    getEncryptionKey();
  }

  return runInTransaction(tx, async (transaction) => {
    const existing = await findUserAiAssistantConfig(appUserId, { tx: transaction });
    const provider = hasOwn(payload, "provider")
      ? validateProvider(payload.provider)
      : normalizeProvider(existing?.provider);
    const model = hasOwn(payload, "model")
      ? validateModel(payload.model)
      : validateModel(existing?.model || getDefaultModel());
    const systemPrompt = hasOwn(payload, "systemPrompt")
      ? validateSystemPrompt(payload.systemPrompt)
      : validateSystemPrompt(existing?.systemPrompt);
    const enabled = hasOwn(payload, "enabled")
      ? Boolean(payload.enabled)
      : Boolean(existing?.enabled);
    const nextApiKeyInput = hasOwn(payload, "apiKey")
      ? normalizeApiKey(payload.apiKey)
      : "";
    const nextEncryptedApiKey = nextApiKeyInput
      ? encryptValue(validateApiKey(nextApiKeyInput))
      : existing?.apiKeyEncrypted || "";

    if (!nextEncryptedApiKey) {
      throw buildHttpError(
        "Missing OpenAI API key for AI assistant configuration.",
        "Ajoute une cle API OpenAI pour enregistrer l'assistant conversationnel.",
        400,
      );
    }

    const config = existing
      ? await transaction.userAiAssistantConfig.update({
          where: {
            id: existing.id,
          },
          data: {
            provider,
            model,
            systemPrompt,
            enabled,
            apiKeyEncrypted: nextEncryptedApiKey,
          },
        })
      : await transaction.userAiAssistantConfig.create({
          data: {
            appUserId,
            provider,
            model,
            systemPrompt,
            enabled,
            apiKeyEncrypted: nextEncryptedApiKey,
          },
        });

    return {
      config,
      summary: serializeBaseAssistantConfig(config),
    };
  });
}

export async function deleteUserAiAssistantConfig(appUserId, { tx = prisma } = {}) {
  if (!appUserId) {
    throw buildHttpError(
      "App user id is required.",
      "Connecte-toi pour modifier l'assistant conversationnel.",
      401,
    );
  }

  return runInTransaction(tx, async (transaction) => {
    const existing = await findUserAiAssistantConfig(appUserId, { tx: transaction });

    if (!existing) {
      return {
        removed: false,
        summary: serializeBaseAssistantConfig(null),
      };
    }

    await transaction.userAiAssistantConfig.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      removed: true,
      summary: serializeBaseAssistantConfig(null),
    };
  });
}

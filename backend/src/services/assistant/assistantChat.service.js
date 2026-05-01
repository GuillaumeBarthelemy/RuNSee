import axios from "axios";
import env from "../../config/env.js";
import { resolveUserAiAssistantConfigForChat } from "./assistantConfig.service.js";

const MAX_CONTEXT_LENGTH = 18000;
const MAX_MESSAGES = 10;

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

function normalizeMessageRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return role === "assistant" ? "assistant" : "user";
}

function normalizeMessageContent(value, maxLength = 2500) {
  const text = String(value || "").trim().replace(/\s+\n/g, "\n");

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeMessages(messages = []) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => ({
      role: normalizeMessageRole(message?.role),
      content: normalizeMessageContent(message?.content),
    }))
    .filter((message) => message.content)
    .slice(-MAX_MESSAGES);
}

function stringifyContext(context) {
  try {
    const payload = JSON.stringify(context || {}, null, 2);

    if (!payload || payload === "{}") {
      return "";
    }

    return payload.length > MAX_CONTEXT_LENGTH
      ? `${payload.slice(0, MAX_CONTEXT_LENGTH)}\n...`
      : payload;
  } catch {
    return "";
  }
}

function buildConversationInput(messages = [], context = {}) {
  const safeMessages = normalizeMessages(messages);
  const contextText = stringifyContext(context);
  const transcript = safeMessages.length
    ? safeMessages
        .map((message) => `${message.role === "assistant" ? "Assistant" : "Utilisateur"}: ${message.content}`)
        .join("\n\n")
    : "Utilisateur: Aucune question n'a encore ete posee.";

  return [
    contextText ? `Contexte RunNSee:\n${contextText}` : "",
    "Historique recent de la conversation:",
    transcript,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractResponseText(payload = {}) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputEntries = Array.isArray(payload?.output) ? payload.output : [];
  const texts = [];

  outputEntries.forEach((entry) => {
    const contentItems = Array.isArray(entry?.content) ? entry.content : [];

    contentItems.forEach((item) => {
      const textValue =
        item?.text ||
        item?.output_text ||
        item?.content ||
        "";

      if (typeof textValue === "string" && textValue.trim()) {
        texts.push(textValue.trim());
      }
    });
  });

  return texts.join("\n\n").trim();
}

function buildAssistantInstructions(config, context = {}) {
  const customSystemPrompt = String(config?.systemPrompt || "").trim();
  const contextFocus = Array.isArray(context?.focusAreas) && context.focusAreas.length
    ? `Priorites du contexte courant: ${context.focusAreas.join(", ")}.`
    : "";

  return [
    "Tu es l'assistant conversationnel de RunNSee.",
    "Tu reponds en francais, de facon claire, concise et utile.",
    "Base-toi uniquement sur le contexte RunNSee fourni dans la requete.",
    "Si l'information n'est pas disponible, dis-le clairement et n'invente pas.",
    "Explique les chiffres importants et leurs implications d'entrainement.",
    "Ne formule pas de diagnostic medical et reste prudent sur les conseils sante.",
    "Quand une recommandation est donnee, justifie-la par les donnees du contexte.",
    contextFocus,
    customSystemPrompt,
  ]
    .filter(Boolean)
    .join("\n");
}

function mapProviderError(error) {
  const status = Number(error?.response?.status || 0);
  const details =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "OpenAI request failed.";

  if (status === 401 || status === 403) {
    return buildHttpError(
      details,
      "La cle API OpenAI configuree pour l'assistant semble invalide ou refusee.",
      502,
    );
  }

  if (status === 429) {
    return buildHttpError(
      details,
      "OpenAI refuse temporairement la requete (quota ou limite atteinte).",
      429,
    );
  }

  return buildHttpError(
    details,
    "Impossible de joindre OpenAI pour le moment.",
    502,
  );
}

export async function createAssistantReply(appUserId, { messages = [], context = {} } = {}) {
  const config = await resolveUserAiAssistantConfigForChat(appUserId);
  const requestPayload = {
    model: config.model || env.openaiDefaultModel,
    instructions: buildAssistantInstructions(config, context),
    input: buildConversationInput(messages, context),
    max_output_tokens: 700,
    store: false,
  };

  try {
    const response = await axios.post(
      `${env.openaiResponsesBaseUrl}/responses`,
      requestPayload,
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    const content = extractResponseText(response.data);

    if (!content) {
      throw buildHttpError(
        "OpenAI returned an empty assistant response.",
        "OpenAI n'a pas renvoye de reponse exploitable.",
        502,
      );
    }

    return {
      content,
      responseId: response.data?.id || null,
      model: response.data?.model || requestPayload.model,
      usage: response.data?.usage || null,
    };
  } catch (error) {
    if (error?.httpStatus) {
      throw error;
    }

    throw mapProviderError(error);
  }
}

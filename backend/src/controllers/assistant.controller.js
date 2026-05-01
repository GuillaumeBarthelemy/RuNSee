import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import { createAssistantReply } from "../services/assistant/assistantChat.service.js";

export async function chatWithAssistant(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await createAssistantReply(user.id, {
      messages: req.body?.messages,
      context: req.body?.context,
    });

    return res.json({
      message: {
        role: "assistant",
        content: result.content,
      },
      responseId: result.responseId,
      model: result.model,
      usage: result.usage,
    });
  } catch (error) {
    next(error);
  }
}

// Unified, plug-and-play AI provider layer (hosted providers only).
//
// Switch everything via env:
//   AI_PROVIDER         openai | gemini   (default: openai)
//   AI_CHAT_MODEL       model for the chat assistant (optional; per-provider default)
//   AI_COMPLETION_MODEL model for inline autocomplete (optional; per-provider default)
//
// Provider keys/endpoints:
//   OPENAI_API_KEY, OPENAI_BASE_URL
//   GEMINI_API_KEY, GEMINI_BASE_URL
//
// Routes call only generateChat() and generateInlineCompletion().

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOpts {
  temperature?: number;
  maxTokens?: number;
}

export const AI_PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();

const DEFAULTS: Record<string, { chat: string; completion: string }> = {
  openai: { chat: "gpt-5.4", completion: "gpt-5.4-nano" },
  gemini: { chat: "gemini-2.5-pro", completion: "gemini-2.5-flash" },
};
const providerDefaults = DEFAULTS[AI_PROVIDER] ?? DEFAULTS.openai;

export const AI_CHAT_MODEL =
  process.env.AI_CHAT_MODEL || providerDefaults.chat;
export const AI_COMPLETION_MODEL =
  process.env.AI_COMPLETION_MODEL || providerDefaults.completion;

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

async function openaiChat(
  messages: ChatMessage[],
  model: string,
  opts: CallOpts
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_completion_tokens: opts.maxTokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    console.error(
      "OpenAI returned empty content.",
      "model:", model,
      "finish_reason:", data.choices?.[0]?.finish_reason,
      "usage:", JSON.stringify(data.usage)
    );
  }
  return content.trim();
}

// ---------------------------------------------------------------------------
// Gemini (Google Generative Language API)
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

async function geminiChat(
  messages: ChatMessage[],
  model: string,
  opts: CallOpts
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Gemini 2.5 models "think", consuming part of the output budget on internal
  // reasoning. If the budget is too small, the visible answer comes back empty.
  // - Flash: disable thinking for fast, direct output.
  // - Pro (can't disable thinking): give a generous output budget so the answer
  //   has room after reasoning.
  const isFlash = model.toLowerCase().includes("flash");
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: isFlash
      ? opts.maxTokens ?? 1024
      : Math.max(opts.maxTokens ?? 4096, 4096),
  };
  if (isFlash) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const body: Record<string, unknown> = { contents, generationConfig };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    console.error(
      "Gemini returned empty text.",
      "model:", model,
      "finishReason:", data.candidates?.[0]?.finishReason,
      "promptFeedback:", JSON.stringify(data.promptFeedback)
    );
  }
  return text.trim();
}

// ---------------------------------------------------------------------------
// Unified entry points
// ---------------------------------------------------------------------------
function providerChat(
  messages: ChatMessage[],
  model: string,
  opts: CallOpts
): Promise<string> {
  switch (AI_PROVIDER) {
    case "openai":
      return openaiChat(messages, model, opts);
    case "gemini":
      return geminiChat(messages, model, opts);
    default:
      throw new Error(`Unknown AI_PROVIDER: ${AI_PROVIDER}`);
  }
}

/** Chat assistant — uses AI_CHAT_MODEL on the selected provider. */
export function generateChat(
  messages: ChatMessage[],
  opts: CallOpts = {}
): Promise<string> {
  return providerChat(messages, AI_CHAT_MODEL, opts);
}

/**
 * Inline code completion — uses a tight prompt that returns only the code to
 * insert between the prefix and suffix.
 */
export async function generateInlineCompletion(
  prefix: string,
  suffix: string
): Promise<string> {
  const system =
    "You are an inline code autocomplete engine inside a code editor. " +
    "You are given the code immediately BEFORE the cursor (PREFIX) and the " +
    "code immediately AFTER the cursor (SUFFIX). Output ONLY the code that " +
    "should be inserted at the cursor so the result is correct and idiomatic. " +
    "Do NOT repeat the prefix or suffix. Do NOT add explanations or markdown " +
    "code fences. If no completion is appropriate, return an empty string.";
  const user = `PREFIX:\n${prefix}\n\nSUFFIX:\n${suffix}`;

  let out = await providerChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    AI_COMPLETION_MODEL,
    { temperature: 0.1, maxTokens: 160 }
  );

  if (out.includes("```")) {
    const m = out.match(/```[\w]*\n?([\s\S]*?)```/);
    out = m ? m[1] : out.replace(/```[\w]*\n?/g, "");
  }
  return out;
}

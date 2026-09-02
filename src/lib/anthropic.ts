/**
 * Eén server-side laag naar de Anthropic API. De sleutel staat
 * uitsluitend server-side (ANTHROPIC_API_KEY) en wordt nooit naar de
 * client gestuurd. Alle generatoren lopen hier doorheen.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export class AnthropicError extends Error {}

export async function generateText({
  system,
  prompt,
  maxTokens = 2000,
  model = DEFAULT_MODEL,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
}): Promise<{ text: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnthropicError(
      "ANTHROPIC_API_KEY ontbreekt. Zet de sleutel in .env.local (server-side).",
    );
  }

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    throw new AnthropicError(
      `Kon de Anthropic API niet bereiken: ${(e as Error).message}`,
    );
  }

  const json = (await res.json().catch(() => null)) as
    | { content?: { type: string; text?: string }[]; error?: { message?: string } }
    | null;

  if (!res.ok) {
    throw new AnthropicError(
      json?.error?.message ?? `Anthropic gaf status ${res.status} terug.`,
    );
  }

  const text = (json?.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text as string)
    .join("\n")
    .trim();

  if (!text) throw new AnthropicError("Leeg antwoord van de API.");

  return { text, model };
}

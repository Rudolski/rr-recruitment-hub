"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { str } from "@/lib/form";
import { AnthropicError, generateText } from "@/lib/anthropic";
import { getGenerator } from "@/lib/generators";

export type GenerateResult = { text: string | null; error: string | null };

export const emptyGenerateResult: GenerateResult = { text: null, error: null };

export async function runGenerator(
  _prev: GenerateResult,
  fd: FormData,
): Promise<GenerateResult> {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) {
    return { text: null, error: "Je account is nog niet aan een organisatie gekoppeld." };
  }

  const key = str(fd, "__key");
  const generator = getGenerator(key);
  if (!generator) return { text: null, error: "Onbekende generator." };

  const values: Record<string, string> = {};
  for (const field of generator.fields) values[field.name] = str(fd, field.name);

  const missing = generator.fields.filter(
    (f) => f.required && !values[f.name],
  );
  if (missing.length > 0) {
    return {
      text: null,
      error: `Vul in: ${missing.map((f) => f.label).join(", ")}.`,
    };
  }

  let result: { text: string; model: string };
  try {
    result = await generateText({
      system: generator.system,
      prompt: generator.buildPrompt(values),
      maxTokens: generator.maxTokens,
    });
  } catch (e) {
    return {
      text: null,
      error:
        e instanceof AnthropicError
          ? e.message
          : "Genereren mislukt. Probeer het opnieuw.",
    };
  }

  const firstField = generator.fields[0]?.name;
  await supabase.from("generated_documents").insert({
    organization_id: organizationId,
    created_by: user.id,
    type: generator.key,
    title: (firstField && values[firstField]) || generator.label,
    input: values,
    content: result.text,
    model: result.model,
  });

  revalidatePath(`/tools/generator/${key}`);
  return { text: result.text, error: null };
}

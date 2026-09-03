"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { str } from "@/lib/form";
import { AnthropicError, generateText } from "@/lib/anthropic";
import { extractFileText } from "@/lib/extract-file";
import { BOOLEAN_SYSTEM, buildBooleanPrompt } from "@/lib/boolean-search";
import type { GenerateResult } from "../[key]/result";

export async function runBoolean(
  _prev: GenerateResult,
  fd: FormData,
): Promise<GenerateResult> {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) {
    return {
      text: null,
      error: "Je account is nog niet aan een organisatie gekoppeld.",
    };
  }

  const notes = str(fd, "notes");
  const locatie = str(fd, "locatie");
  const uitsluiten = str(fd, "uitsluiten");

  let original = str(fd, "original_text");
  const file = fd.get("original_file");
  if (file instanceof File && file.size > 0) {
    const fromFile = await extractFileText(file);
    original = [original, fromFile].filter(Boolean).join("\n\n");
  }

  if (!original.trim() && !notes.trim()) {
    return {
      text: null,
      error:
        "Voeg de vacaturetekst toe (bestand of tekst) of aantekeningen.",
    };
  }

  let result: { text: string; model: string };
  try {
    result = await generateText({
      system: BOOLEAN_SYSTEM,
      prompt: buildBooleanPrompt({ original, notes, locatie, uitsluiten }),
      maxTokens: 700,
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

  await supabase.from("generated_documents").insert({
    organization_id: organizationId,
    created_by: user.id,
    type: "boolean",
    title: (locatie ? `${locatie} — ` : "") + result.text.split("\n")[0].slice(0, 80),
    input: { notes, locatie, uitsluiten },
    content: result.text,
    model: result.model,
  });

  revalidatePath("/tools/generator/boolean");
  return { text: result.text, error: null };
}

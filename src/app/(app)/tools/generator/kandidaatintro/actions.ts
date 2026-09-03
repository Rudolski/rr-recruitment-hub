"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { str } from "@/lib/form";
import { AnthropicError, generateText } from "@/lib/anthropic";
import { extractFileText } from "@/lib/extract-file";
import {
  KANDIDAATINTRO_SYSTEM,
  buildKandidaatintroPrompt,
} from "@/lib/kandidaatintro";
import type { GenerateResult } from "../[key]/result";

export async function runKandidaatintro(
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

  const klant = str(fd, "klant");
  const vacature = str(fd, "vacature");
  const notes = str(fd, "notes");

  let cv = str(fd, "cv_text");
  const file = fd.get("cv_file");
  if (file instanceof File && file.size > 0) {
    const fromFile = await extractFileText(file);
    cv = [cv, fromFile].filter(Boolean).join("\n\n");
  }

  if (!klant || !vacature) {
    return { text: null, error: "Vul de klant en de vacature in." };
  }
  if (!cv.trim() && !notes.trim()) {
    return {
      text: null,
      error: "Voeg een cv (bestand of tekst) of gespreksaantekeningen toe.",
    };
  }

  let result: { text: string; model: string };
  try {
    result = await generateText({
      system: KANDIDAATINTRO_SYSTEM,
      prompt: buildKandidaatintroPrompt({ klant, vacature, cv, notes }),
      maxTokens: 3000,
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
    type: "kandidaatintro",
    title: `${klant} — ${vacature}`,
    input: { klant, vacature, notes },
    content: result.text,
    model: result.model,
  });

  revalidatePath("/tools/generator/kandidaatintro");
  return { text: result.text, error: null };
}

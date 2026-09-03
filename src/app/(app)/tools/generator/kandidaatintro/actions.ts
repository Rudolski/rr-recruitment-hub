"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { str } from "@/lib/form";
import { AnthropicError, generateText } from "@/lib/anthropic";
import {
  KANDIDAATINTRO_SYSTEM,
  buildKandidaatintroPrompt,
  type IntroCandidate,
} from "@/lib/kandidaatintro";
import type { GenerateResult } from "../[key]/result";

export async function runKandidaatintro(
  _prev: GenerateResult,
  fd: FormData,
): Promise<GenerateResult> {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) {
    return { text: null, error: "Je account is nog niet aan een organisatie gekoppeld." };
  }

  const klant = str(fd, "klant");
  const vacature = str(fd, "vacature");
  const taalRaw = str(fd, "taal");
  const taal = taalRaw === "en" ? "en" : taalRaw === "auto" ? "auto" : "nl";
  const extra = str(fd, "extra");
  const count = Math.min(10, Math.max(1, Number(str(fd, "count")) || 1));

  const candidates: IntroCandidate[] = [];
  for (let i = 0; i < count; i++) {
    candidates.push({
      naam: str(fd, `naam_${i}`),
      cv: str(fd, `cv_${i}`),
      aantekeningen: str(fd, `notes_${i}`),
    });
  }

  if (!klant || !vacature) {
    return { text: null, error: "Vul de klant en de vacature in." };
  }
  if (!candidates.some((c) => c.naam || c.cv || c.aantekeningen)) {
    return {
      text: null,
      error: "Voeg minstens één kandidaat toe met een cv of aantekeningen.",
    };
  }

  let result: { text: string; model: string };
  try {
    result = await generateText({
      system: KANDIDAATINTRO_SYSTEM,
      prompt: buildKandidaatintroPrompt({
        klant,
        vacature,
        taal,
        extra,
        candidates,
      }),
      maxTokens: 3200,
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

  const names = candidates
    .map((c) => c.naam.trim())
    .filter(Boolean)
    .join(", ");

  await supabase.from("generated_documents").insert({
    organization_id: organizationId,
    created_by: user.id,
    type: "kandidaatintro",
    title: `${klant} — ${vacature}${names ? ` — ${names}` : ""}`,
    input: { klant, vacature, taal, extra, candidates },
    content: result.text,
    model: result.model,
  });

  revalidatePath("/tools/generator/kandidaatintro");
  return { text: result.text, error: null };
}

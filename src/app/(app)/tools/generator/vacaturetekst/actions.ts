"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { str } from "@/lib/form";
import { AnthropicError, generateText } from "@/lib/anthropic";
import { extractFileText } from "@/lib/extract-file";
import {
  VACATURE_VARIANT_LABELS,
  buildVacaturetekstPrompt,
  vacatureSystemPrompt,
  type VacatureContact,
  type VacatureVariant,
} from "@/lib/vacaturetekst";
import type { GenerateResult } from "../[key]/result";

export async function runVacaturetekst(
  _prev: GenerateResult,
  fd: FormData,
): Promise<GenerateResult> {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) {
    return { text: null, error: "Je account is nog niet aan een organisatie gekoppeld." };
  }

  const variantRaw = str(fd, "variant");
  const variant: VacatureVariant = (
    ["website_klant", "website_anoniem", "banensite"] as const
  ).includes(variantRaw as VacatureVariant)
    ? (variantRaw as VacatureVariant)
    : "website_klant";
  const contact: VacatureContact = str(fd, "contact") === "juul" ? "juul" : "ruud";
  const klantnaam = str(fd, "klantnaam");
  const notes = str(fd, "notes");

  let original = str(fd, "original_text");
  const file = fd.get("original_file");
  if (file instanceof File && file.size > 0) {
    const fromFile = await extractFileText(file);
    original = [original, fromFile].filter(Boolean).join("\n\n");
  }

  if (!original.trim()) {
    return {
      text: null,
      error:
        "Voeg de originele vacaturetekst toe — upload een pdf/tekstbestand of plak de tekst.",
    };
  }
  if (variant !== "website_anoniem" && !klantnaam) {
    return { text: null, error: "Vul de klantnaam in." };
  }

  let result: { text: string; model: string };
  try {
    result = await generateText({
      system: vacatureSystemPrompt(variant),
      prompt: buildVacaturetekstPrompt({
        variant,
        contact,
        klantnaam,
        original,
        notes,
      }),
      maxTokens: 4000,
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
    type: "vacaturetekst",
    title: `${klantnaam || "Anoniem"} — ${VACATURE_VARIANT_LABELS[variant]}`,
    input: { variant, contact, klantnaam, notes },
    content: result.text,
    model: result.model,
  });

  revalidatePath("/tools/generator/vacaturetekst");
  return { text: result.text, error: null };
}

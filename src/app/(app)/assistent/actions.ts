"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { generateWithTools } from "@/lib/anthropic";
import {
  ASSISTANT_TOOLS,
  buildSystemPrompt,
  proposalFromToolUse,
  sanitizeProposal,
} from "@/lib/assistant-server";
import type { ApplyResult, ChatTurn, Proposal } from "@/lib/assistant";
import { describeProposal } from "@/lib/assistant";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const MAX_TURNS = 12;
const MAX_TURN_CHARS = 6000;

export async function askAssistant(
  history: ChatTurn[],
): Promise<{ reply: string; proposals: Proposal[]; error?: string }> {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) {
    return { reply: "", proposals: [], error: "Geen organisatie gekoppeld." };
  }

  // Alleen afwisselend user/assistant, beginnend met user, begrensd in grootte.
  const turns: ChatTurn[] = [];
  for (const t of history.slice(-MAX_TURNS)) {
    const content = String(t?.content ?? "").trim().slice(0, MAX_TURN_CHARS);
    const role = t?.role === "assistant" ? "assistant" : "user";
    if (!content) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return { reply: "", proposals: [], error: "Typ eerst een bericht." };
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("name")
    .eq("organization_id", organizationId)
    .order("name");

  const now = new Date();
  const todayIso = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const weekday = now.toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
  });

  try {
    const { text, toolUses } = await generateWithTools({
      system: buildSystemPrompt((clients ?? []).map((c) => c.name), todayIso, weekday),
      messages: turns,
      tools: ASSISTANT_TOOLS,
      maxTokens: 1500,
    });
    const proposals = toolUses
      .map((t) => proposalFromToolUse(t.name, t.input))
      .filter((p): p is Proposal => p !== null);
    return {
      reply: text || (proposals.length ? "Dit stel ik voor:" : "Dat is me niet helemaal duidelijk."),
      proposals,
    };
  } catch (e) {
    return { reply: "", proposals: [], error: (e as Error).message };
  }
}

export async function applyProposals(raw: unknown): Promise<ApplyResult[]> {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) return [{ ok: false, message: "Geen organisatie gekoppeld." }];

  const proposals = (Array.isArray(raw) ? raw : [])
    .slice(0, 10)
    .map((p) => sanitizeProposal(p))
    // Agenda-afspraken worden niet hier uitgevoerd maar via de Outlook-knop.
    .filter(
      (p): p is Exclude<Proposal, { type: "calendar_event" }> =>
        p !== null && p.type !== "calendar_event",
    );
  if (proposals.length === 0) return [{ ok: false, message: "Niets om uit te voeren." }];

  const results: ApplyResult[] = [];

  for (const p of proposals) {
    try {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", organizationId);
      const existing = (clients ?? []).find(
        (c) => norm(c.name) === norm(p.type === "add_note" ? p.client_name : p.company_name),
      );

      if (p.type === "add_note") {
        if (!existing) {
          results.push({ ok: false, message: `Klant "${p.client_name}" niet gevonden.` });
          continue;
        }
        const { error } = await supabase.from("client_notes").insert({
          organization_id: organizationId,
          client_id: existing.id,
          author_id: user.id,
          body: p.body,
          follow_up_on: p.follow_up_on ?? null,
        });
        if (error) throw new Error(error.message);
        results.push({
          ok: true,
          message: `Notitie toegevoegd bij ${existing.name}.`,
          href: `/klanten/${existing.id}`,
        });
        continue;
      }

      let clientId = existing?.id;
      let created = false;
      if (!clientId) {
        const { data, error } = await supabase
          .from("clients")
          .insert({
            organization_id: organizationId,
            name: p.company_name,
            status: p.status,
            account_owner_id: user.id,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Klant aanmaken mislukt.");
        clientId = data.id;
        created = true;
      }

      const parts: string[] = [];
      if (created) parts.push(`${p.company_name} aangemaakt als ${p.status.replace("_", " ")}`);
      else parts.push(`${existing?.name} bestond al`);

      if (p.contact_name) {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("name")
          .eq("client_id", clientId);
        const has = (contacts ?? []).some((c) => norm(c.name) === norm(p.contact_name ?? ""));
        if (!has) {
          const { error } = await supabase.from("contacts").insert({
            organization_id: organizationId,
            client_id: clientId,
            name: p.contact_name,
            role: p.contact_role ?? null,
            email: p.contact_email ?? null,
            phone: p.contact_phone ?? null,
            is_primary: (contacts ?? []).length === 0,
          });
          if (error) throw new Error(error.message);
          parts.push(`contactpersoon ${p.contact_name} toegevoegd`);
        } else {
          parts.push(`${p.contact_name} stond er al`);
        }
      }

      const body = [p.note, p.linkedin_url ? `LinkedIn: ${p.linkedin_url}` : null]
        .filter(Boolean)
        .join("\n");
      if (body || p.follow_up_on) {
        const { error } = await supabase.from("client_notes").insert({
          organization_id: organizationId,
          client_id: clientId,
          author_id: user.id,
          body: body || "Opvolgen",
          follow_up_on: p.follow_up_on ?? null,
        });
        if (error) throw new Error(error.message);
        parts.push(p.follow_up_on ? "notitie met opvolgdatum gezet" : "notitie toegevoegd");
      }

      results.push({ ok: true, message: `${parts.join(", ")}.`, href: `/klanten/${clientId}` });
    } catch (e) {
      results.push({ ok: false, message: `${describeProposal(p)} — mislukt: ${(e as Error).message}` });
    }
  }

  revalidatePath("/klanten");
  revalidatePath("/acquisitie");
  revalidatePath("/dashboard");
  revalidatePath("/klanten", "layout");
  return results;
}

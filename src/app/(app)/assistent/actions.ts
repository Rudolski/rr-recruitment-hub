"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { generateWithTools } from "@/lib/anthropic";
import {
  ASSISTANT_TOOLS,
  buildSystemPrompt,
  proposalFromToolUse,
  sanitizeProposal,
  type AssistantContext,
} from "@/lib/assistant-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ApplyResult, ChatTurn, Proposal } from "@/lib/assistant";
import { describeProposal } from "@/lib/assistant";
import { formatDate } from "@/lib/format";

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
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  // Lopende vacatures met hun funnel en open actiepunten, plus open
  // opvolgingen, zodat het model naar bestaande ids kan verwijzen.
  const { data: vacancies } = await supabase
    .from("vacancies")
    .select("id, title, client_id")
    .eq("organization_id", organizationId)
    .in("status", ["open", "concept", "on_hold"])
    .order("title");
  const vacancyIds = (vacancies ?? []).map((v) => v.id);
  const [{ data: candidates }, { data: tasks }, { data: followUps }] = await Promise.all([
    vacancyIds.length
      ? supabase
          .from("vacancy_candidates")
          .select("vacancy_id, first_name, stage")
          .eq("organization_id", organizationId)
          .in("vacancy_id", vacancyIds)
          .order("position")
      : Promise.resolve({ data: [] as { vacancy_id: string; first_name: string; stage: string }[] }),
    vacancyIds.length
      ? supabase
          .from("vacancy_tasks")
          .select("id, vacancy_id, body")
          .eq("organization_id", organizationId)
          .eq("done", false)
          .in("vacancy_id", vacancyIds)
          .order("created_at")
      : Promise.resolve({ data: [] as { id: string; vacancy_id: string; body: string }[] }),
    supabase
      .from("client_notes")
      .select("id, client_id, body, follow_up_on")
      .eq("organization_id", organizationId)
      .eq("follow_up_done", false)
      .not("follow_up_on", "is", null)
      .order("follow_up_on")
      .limit(100),
  ]);

  const ctx: AssistantContext = {
    clientNames: (clients ?? []).map((c) => c.name),
    vacancies: (vacancies ?? []).map((v) => ({
      id: v.id,
      label: `${v.title} (${clientName.get(v.client_id) ?? "onbekende klant"})`,
      candidates: (candidates ?? [])
        .filter((c) => c.vacancy_id === v.id)
        .map((c) => ({ first_name: c.first_name, stage: c.stage })),
      tasks: (tasks ?? [])
        .filter((t) => t.vacancy_id === v.id)
        .map((t) => ({ id: t.id, body: t.body.replace(/\s+/g, " ").slice(0, 200) })),
    })),
    followUps: (followUps ?? []).map((f) => ({
      id: f.id,
      client_name: clientName.get(f.client_id) ?? "onbekende klant",
      body: f.body.replace(/\s+/g, " ").slice(0, 200),
      follow_up_on: f.follow_up_on ?? "",
    })),
  };

  const now = new Date();
  const todayIso = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const weekday = now.toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
  });

  try {
    const { text, toolUses } = await generateWithTools({
      system: buildSystemPrompt(ctx, todayIso, weekday),
      messages: turns,
      tools: ASSISTANT_TOOLS,
      maxTokens: 1500,
    });
    const proposals = toolUses
      .map((t) => proposalFromToolUse(t.name, t.input, ctx))
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
      if (
        p.type !== "create_prospect" &&
        p.type !== "add_note"
      ) {
        results.push(await applyHubProposal(supabase, organizationId, p));
        continue;
      }

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
  revalidatePath("/vacatures", "layout");
  revalidatePath("/procedures");
  return results;
}

type HubProposal = Exclude<
  Proposal,
  { type: "calendar_event" | "create_prospect" | "add_note" }
>;

/**
 * Procedures, actiepunten en opvolgingen. Alles wordt opnieuw opgezocht
 * binnen de eigen organisatie; wat de browser terugstuurt is alleen een
 * verwijzing.
 */
async function applyHubProposal(
  db: SupabaseClient<Database>,
  organizationId: string,
  p: HubProposal,
): Promise<ApplyResult> {
  if (p.type === "add_candidate" || p.type === "move_candidate" || p.type === "add_task") {
    const { data: vacancy } = await db
      .from("vacancies")
      .select("id, title")
      .eq("id", p.vacancy_id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!vacancy) return { ok: false, message: `Vacature "${p.vacancy_label}" niet gevonden.` };
    const href = `/vacatures/${vacancy.id}`;

    if (p.type === "add_task") {
      const { error } = await db.from("vacancy_tasks").insert({
        organization_id: organizationId,
        vacancy_id: vacancy.id,
        body: p.body,
      });
      if (error) throw new Error(error.message);
      return { ok: true, message: `Actiepunt toegevoegd bij ${vacancy.title}.`, href };
    }

    const { data: existing } = await db
      .from("vacancy_candidates")
      .select("id, first_name, position")
      .eq("vacancy_id", vacancy.id)
      .eq("organization_id", organizationId);
    const matches = (existing ?? []).filter((c) => norm(c.first_name) === norm(p.first_name));

    if (p.type === "move_candidate") {
      if (matches.length === 0) {
        return { ok: false, message: `${p.first_name} staat niet bij ${vacancy.title}.` };
      }
      if (matches.length > 1) {
        return {
          ok: false,
          message: `Er staan meerdere kandidaten met de naam ${p.first_name} bij ${vacancy.title}. Pas dit in de hub zelf aan.`,
          href,
        };
      }
      const { error } = await db
        .from("vacancy_candidates")
        .update({
          stage: p.stage,
          stage_date: p.stage_date ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matches[0].id)
        .eq("organization_id", organizationId);
      if (error) throw new Error(error.message);
      return { ok: true, message: `${matches[0].first_name} bij ${vacancy.title} verplaatst.`, href };
    }

    if (matches.length > 0) {
      return {
        ok: false,
        message: `${p.first_name} staat al bij ${vacancy.title}. Niet dubbel toegevoegd.`,
        href,
      };
    }
    const nextPos = Math.max(-1, ...(existing ?? []).map((c) => Number(c.position) || 0)) + 1;
    const { error } = await db.from("vacancy_candidates").insert({
      organization_id: organizationId,
      vacancy_id: vacancy.id,
      first_name: p.first_name,
      stage: p.stage,
      stage_date: p.stage_date ?? null,
      position: nextPos,
    });
    if (error) throw new Error(error.message);
    return { ok: true, message: `${p.first_name} toegevoegd aan ${vacancy.title}.`, href };
  }

  if (p.type === "complete_task") {
    const { data: task } = await db
      .from("vacancy_tasks")
      .select("id, vacancy_id, done")
      .eq("id", p.task_id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!task) return { ok: false, message: "Actiepunt niet gevonden." };
    const href = `/vacatures/${task.vacancy_id}`;
    if (task.done) return { ok: true, message: "Actiepunt was al afgevinkt.", href };
    const { error } = await db
      .from("vacancy_tasks")
      .update({ done: true, done_at: new Date().toISOString() })
      .eq("id", task.id)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    return { ok: true, message: `Actiepunt afgevinkt bij ${p.vacancy_label}.`, href };
  }

  // Opvolging verzetten of afronden.
  const { data: note } = await db
    .from("client_notes")
    .select("id, client_id")
    .eq("id", p.note_id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!note) return { ok: false, message: "Opvolging niet gevonden." };
  const href = `/klanten/${note.client_id}`;
  const update =
    p.type === "complete_follow_up"
      ? { follow_up_done: true, follow_up_done_at: new Date().toISOString() }
      : { follow_up_on: p.follow_up_on, follow_up_done: false, follow_up_done_at: null };
  const { error } = await db
    .from("client_notes")
    .update(update)
    .eq("id", note.id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  return {
    ok: true,
    message:
      p.type === "complete_follow_up"
        ? `Opvolging bij ${p.client_name} afgerond.`
        : `Opvolging bij ${p.client_name} verzet naar ${formatDate(p.follow_up_on)}.`,
    href,
  };
}

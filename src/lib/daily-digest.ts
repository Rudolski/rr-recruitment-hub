import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Client, ClientNote, WatchSource, WatchVacancy } from "@/lib/types";

type DB = SupabaseClient<Database>;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://rr-recruitment-hub.vercel.app";
const DIGEST_TO = process.env.DAILY_DIGEST_TO ?? "info@rr-recruitment.nl";
// Resend staat versturen zonder geverifieerd domein toe vanaf dit
// gedeelde testadres. Zodra rr-recruitment.nl geverifieerd is in
// Resend kan dit vervangen worden door iets als
// "RR Recruitment Hub <hub@rr-recruitment.nl>".
const DIGEST_FROM =
  process.env.DAILY_DIGEST_FROM ?? "RR Recruitment Hub <onboarding@resend.dev>";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const dateFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });

type FollowUp = {
  clientId: string;
  clientName: string;
  body: string;
  followUpOn: string;
  overdue: boolean;
};

async function buildFollowUps(db: DB): Promise<FollowUp[]> {
  const today = todayIso();

  const { data: notes, error: notesError } = await db
    .from("client_notes")
    .select("*")
    .eq("follow_up_done", false)
    .not("follow_up_on", "is", null)
    .lte("follow_up_on", today)
    .order("follow_up_on", { ascending: true })
    .returns<ClientNote[]>();
  // Stil falende query (bijv. een verlopen/foute service-role key)
  // moet nooit als "niks openstaand" overkomen.
  if (notesError) throw new Error(`client_notes ophalen mislukt: ${notesError.message}`);

  if (!notes || notes.length === 0) return [];

  const clientIds = [...new Set(notes.map((n) => n.client_id))];
  const { data: clients, error: clientsError } = await db
    .from("clients")
    .select("id, name")
    .in("id", clientIds)
    .returns<Pick<Client, "id" | "name">[]>();
  if (clientsError) throw new Error(`clients ophalen mislukt: ${clientsError.message}`);
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return notes.map((n) => ({
    clientId: n.client_id,
    clientName: clientName.get(n.client_id) ?? "Relatie",
    body: n.body,
    followUpOn: n.follow_up_on ?? today,
    overdue: (n.follow_up_on ?? today) < today,
  }));
}

type NewVacancy = {
  title: string;
  company: string | null;
  url: string;
  sourceName: string;
};

/**
 * Aantal dagen terugkijken voor "nieuw gevonden" vacatures. De radar
 * scant elke dag (ook in het weekend), deze mail alleen doordeweeks —
 * op maandag dus terugkijken t/m vrijdag, anders gewoon 1 dag.
 */
function lookbackDays(): number {
  const day = new Date().getUTCDay(); // 0 = zondag, 1 = maandag, ...
  return day === 1 ? 3 : 1;
}

async function buildNewVacancies(db: DB): Promise<NewVacancy[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - lookbackDays());

  const { data: vacancies, error: vacError } = await db
    .from("watch_vacancies")
    .select("*")
    .gte("first_seen_at", cutoff.toISOString())
    .is("closed_at", null)
    .order("first_seen_at", { ascending: false })
    .returns<WatchVacancy[]>();
  if (vacError) throw new Error(`watch_vacancies ophalen mislukt: ${vacError.message}`);
  if (!vacancies || vacancies.length === 0) return [];

  const sourceIds = [...new Set(vacancies.map((v) => v.source_id))];
  const { data: sources, error: sourcesError } = await db
    .from("watch_sources")
    .select("id, name")
    .in("id", sourceIds)
    .returns<Pick<WatchSource, "id" | "name">[]>();
  if (sourcesError) throw new Error(`watch_sources ophalen mislukt: ${sourcesError.message}`);
  const sourceName = new Map((sources ?? []).map((s) => [s.id, s.name]));

  return vacancies.map((v) => ({
    title: v.title,
    company: v.company,
    url: v.url,
    sourceName: sourceName.get(v.source_id) ?? "Radar",
  }));
}

function renderEmail(
  followUps: FollowUp[],
  newVacancies: NewVacancy[],
): { subject: string; html: string } {
  const dateLabel = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const followUpRows = followUps
    .map((f) => {
      const label = f.overdue
        ? `te laat sinds ${dateFmt.format(new Date(f.followUpOn))}`
        : "vandaag";
      return `
        <li style="margin-bottom:12px;">
          <a href="${SITE_URL}/klanten/${f.clientId}" style="color:#a95e3f;font-weight:600;text-decoration:none;">${escapeHtml(f.clientName)}</a>
          <span style="color:#71717a;"> — ${label}</span>
          ${f.body ? `<div style="color:#3f3f46;margin-top:2px;">${escapeHtml(f.body)}</div>` : ""}
        </li>`;
    })
    .join("");

  const vacancyRows = newVacancies
    .map((v) => {
      const who = v.company
        ? `<strong>${escapeHtml(v.company)}</strong> — ${escapeHtml(v.title)}`
        : escapeHtml(v.title);
      return `
        <li style="margin-bottom:12px;">
          <a href="${v.url}" style="color:#0d1e2e;text-decoration:none;">${who}</a>
          <span style="color:#71717a;"> · ${escapeHtml(v.sourceName)}</span>
        </li>`;
    })
    .join("");

  const followUpSection = followUps.length
    ? `
      <h1 style="color:#0d1e2e;font-size:18px;margin:24px 0 12px;">Opvolgacties</h1>
      <p style="color:#3f3f46;margin:0 0 8px;">${followUps.length} openstaande opvolgactie${followUps.length === 1 ? "" : "s"} bij Klanten/Acquisitie:</p>
      <ul style="list-style:none;padding:0;margin:0;">${followUpRows}</ul>
      <p style="margin-top:12px;">
        <a href="${SITE_URL}/klanten" style="color:#a95e3f;">Open Klanten →</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL}/acquisitie" style="color:#a95e3f;">Open Acquisitie →</a>
      </p>`
    : "";

  const vacancySection = newVacancies.length
    ? `
      <h1 style="color:#0d1e2e;font-size:18px;margin:24px 0 12px;">Nieuw op de radar</h1>
      <p style="color:#3f3f46;margin:0 0 8px;">${newVacancies.length} nieuwe exclusieve vacature${newVacancies.length === 1 ? "" : "s"}:</p>
      <ul style="list-style:none;padding:0;margin:0;">${vacancyRows}</ul>
      <p style="margin-top:12px;">
        <a href="${SITE_URL}/radar" style="color:#a95e3f;">Open Vacature-radar →</a>
      </p>`
    : "";

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <p style="color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">RR Recruitment Hub</p>
      <p style="color:#0d1e2e;font-size:20px;font-weight:600;margin:0;">${dateLabel}</p>
      ${followUpSection}
      ${vacancySection}
    </div>`;

  const parts = [];
  if (followUps.length) parts.push(`${followUps.length} opvolgactie${followUps.length === 1 ? "" : "s"}`);
  if (newVacancies.length) parts.push(`${newVacancies.length} nieuwe vacature${newVacancies.length === 1 ? "" : "s"}`);

  return {
    subject: `${parts.join(" · ")} — RR Recruitment Hub`,
    html,
  };
}

export type DigestResult =
  | { sent: true; followUps: number; newVacancies: number }
  | { sent: false; reason: string };

/** Bouwt en verstuurt de digest, ongeacht of 'ie vandaag al ging. */
export async function sendDailyDigest(db: DB): Promise<DigestResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY ontbreekt.");

  const [followUps, newVacancies] = await Promise.all([
    buildFollowUps(db),
    buildNewVacancies(db),
  ]);

  if (followUps.length === 0 && newVacancies.length === 0) {
    return { sent: false, reason: "niets te melden" };
  }

  const { subject, html } = renderEmail(followUps, newVacancies);
  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: DIGEST_FROM,
    to: DIGEST_TO,
    subject,
    html,
  });
  if (error) throw new Error(error.message);

  return { sent: true, followUps: followUps.length, newVacancies: newVacancies.length };
}

/**
 * Zelfde als sendDailyDigest, maar slaat over als er vandaag al een
 * digest is verstuurd voor deze organisatie. Vangnet-mechanisme: naast
 * de GitHub Actions-cron roept ook elke pageload van de hub (zie
 * (app)/layout.tsx) dit aan — welke van de twee er ook het eerst bij
 * is, er gaat nooit twee keer dezelfde dag een mail uit.
 */
export async function sendDailyDigestIfNotAlreadySentToday(
  db: DB,
  organizationId: string,
): Promise<DigestResult | { sent: false; reason: "al verstuurd vandaag" }> {
  const today = todayIso();
  const { data: log } = await db
    .from("digest_send_log")
    .select("last_sent_on")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (log?.last_sent_on === today) {
    return { sent: false, reason: "al verstuurd vandaag" };
  }

  const result = await sendDailyDigest(db);

  // Alleen vastleggen als er ook echt iets verstuurd is: bij "niets te
  // melden" blijven we het de rest van de dag checken, zodat een later
  // die dag toegevoegde opvolgactie alsnog een mail kan opleveren.
  if (result.sent) {
    await db.from("digest_send_log").upsert({
      organization_id: organizationId,
      last_sent_on: today,
      last_sent_at: new Date().toISOString(),
    });
  }

  return result;
}

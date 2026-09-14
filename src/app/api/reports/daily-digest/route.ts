import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Client, ClientNote } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rr-recruitment-hub.vercel.app";
const DIGEST_TO = process.env.DAILY_DIGEST_TO ?? "info@rr-recruitment.nl";
// Resend staat versturen zonder geverifieerd domein toe vanaf dit
// gedeelde testadres. Zodra rr-recruitment.nl geverifieerd is in
// Resend kan dit vervangen worden door iets als
// "RR Recruitment Hub <hub@rr-recruitment.nl>".
const DIGEST_FROM = process.env.DAILY_DIGEST_FROM ?? "RR Recruitment Hub <onboarding@resend.dev>";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
});

type FollowUp = {
  clientId: string;
  clientName: string;
  body: string;
  followUpOn: string;
  overdue: boolean;
};

async function buildFollowUps(
  db: ReturnType<typeof createAdminClient>,
): Promise<FollowUp[]> {
  const today = todayIso();

  const { data: notes } = await db
    .from("client_notes")
    .select("*")
    .eq("follow_up_done", false)
    .not("follow_up_on", "is", null)
    .lte("follow_up_on", today)
    .order("follow_up_on", { ascending: true })
    .returns<ClientNote[]>();

  if (!notes || notes.length === 0) return [];

  const clientIds = [...new Set(notes.map((n) => n.client_id))];
  const { data: clients } = await db
    .from("clients")
    .select("id, name")
    .in("id", clientIds)
    .returns<Pick<Client, "id" | "name">[]>();
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return notes.map((n) => ({
    clientId: n.client_id,
    clientName: clientName.get(n.client_id) ?? "Relatie",
    body: n.body,
    followUpOn: n.follow_up_on ?? today,
    overdue: (n.follow_up_on ?? today) < today,
  }));
}

function renderEmail(followUps: FollowUp[]): { subject: string; html: string } {
  const dateLabel = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const rows = followUps
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

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <p style="color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">RR Recruitment Hub</p>
      <h1 style="color:#0d1e2e;font-size:20px;margin:0 0 16px;">Opvolgacties — ${dateLabel}</h1>
      <p style="color:#3f3f46;">${followUps.length} openstaande opvolgactie${followUps.length === 1 ? "" : "s"} bij Klanten/Acquisitie:</p>
      <ul style="list-style:none;padding:0;margin:16px 0;">${rows}</ul>
      <p style="margin-top:24px;">
        <a href="${SITE_URL}/klanten" style="color:#a95e3f;">Open Klanten →</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL}/acquisitie" style="color:#a95e3f;">Open Acquisitie →</a>
      </p>
    </div>`;

  return {
    subject: `${followUps.length} opvolgactie${followUps.length === 1 ? "" : "s"} vandaag — RR Recruitment Hub`,
    html,
  };
}

async function run(req: NextRequest) {
  const secret = process.env.RADAR_CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.has("x-vercel-cron");
  const authorized = isVercelCron || (!!secret && auth === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY ontbreekt." },
      { status: 500 },
    );
  }

  let db;
  try {
    db = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const followUps = await buildFollowUps(db);

  if (req.nextUrl.searchParams.get("debug") === "1") {
    const today = todayIso();
    const { data: raw, error: rawError } = await db
      .from("client_notes")
      .select("id, follow_up_on, follow_up_done")
      .order("follow_up_on", { ascending: true });
    return NextResponse.json({
      today,
      supabaseUrlHost: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
        /^https?:\/\//,
        "",
      ),
      followUpsFound: followUps.length,
      rawCount: raw?.length ?? null,
      rawError: rawError?.message ?? null,
      raw,
    });
  }

  if (followUps.length === 0) {
    return NextResponse.json({ sent: false, reason: "geen openstaande opvolgacties" });
  }

  const { subject, html } = renderEmail(followUps);
  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: DIGEST_FROM,
    to: DIGEST_TO,
    subject,
    html,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true, count: followUps.length });
}

export function GET(req: NextRequest) {
  return run(req);
}

export function POST(req: NextRequest) {
  return run(req);
}

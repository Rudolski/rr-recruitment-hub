import { formatDate } from "@/lib/format";
import {
  CANDIDATE_STAGE_LABELS,
  CLIENT_STATUS_LABELS,
  type CandidateStage,
  type ClientStatus,
} from "@/lib/types";

type CandidateFields = {
  vacancy_id: string;
  /** Alleen voor weergave; bij uitvoeren wordt de vacature opnieuw opgezocht. */
  vacancy_label: string;
  first_name: string;
  stage: CandidateStage;
  /** Datum bij de fase, bijv. de datum van het gesprek. YYYY-MM-DD */
  stage_date?: string;
};

/** Een voorgestelde wijziging in de hub; pas uitgevoerd na bevestiging. */
export type Proposal =
  | {
      type: "create_prospect";
      company_name: string;
      status: ClientStatus;
      contact_name?: string;
      contact_role?: string;
      contact_email?: string;
      contact_phone?: string;
      linkedin_url?: string;
      note?: string;
      follow_up_on?: string;
    }
  | {
      type: "add_note";
      client_name: string;
      body: string;
      follow_up_on?: string;
    }
  | {
      type: "calendar_event";
      title: string;
      /** Lokale tijd, YYYY-MM-DDTHH:mm */
      start: string;
      end: string;
      description?: string;
      location?: string;
    }
  /* Procedures: kandidaten (alleen voornaam) in de funnel van een vacature. */
  | ({ type: "add_candidate" } & CandidateFields)
  | ({ type: "move_candidate" } & CandidateFields)
  /* Actiepunten bij een vacature. */
  | {
      type: "add_task";
      vacancy_id: string;
      vacancy_label: string;
      body: string;
    }
  | {
      type: "complete_task";
      task_id: string;
      vacancy_label: string;
      task_label: string;
    }
  /* Opvolgdatum van een bestaande notitie bij een klant. */
  | {
      type: "reschedule_follow_up";
      note_id: string;
      client_name: string;
      note_label: string;
      follow_up_on: string;
    }
  | {
      type: "complete_follow_up";
      note_id: string;
      client_name: string;
      note_label: string;
    };

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ApplyResult = { ok: boolean; message: string; href?: string };

/** "2026-10-07T10:00" -> "07-10 10:00" */
function shortWhen(local: string): string {
  const [d, t] = local.split("T");
  const [, m, day] = d.split("-");
  return `${day}-${m} ${t}`;
}

/** Outlook op het web (zakelijk 365) opent met de afspraak al ingevuld. */
export function outlookUrl(p: Extract<Proposal, { type: "calendar_event" }>): string {
  const parts: [string, string][] = [
    ["path", "/calendar/action/compose"],
    ["rru", "addevent"],
    ["subject", p.title],
    ["startdt", `${p.start}:00`],
    ["enddt", `${p.end}:00`],
  ];
  if (p.location) parts.push(["location", p.location]);
  if (p.description) parts.push(["body", p.description]);
  return `https://outlook.office.com/calendar/0/deeplink/compose?${parts
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&")}`;
}

export function describeProposal(p: Proposal): string {
  if (p.type === "calendar_event") {
    return `Afspraak: ${p.title}, ${shortWhen(p.start)}–${p.end.split("T")[1]}`;
  }
  if (p.type === "add_candidate" || p.type === "move_candidate") {
    const stage = CANDIDATE_STAGE_LABELS[p.stage];
    const date = p.stage_date ? ` (${formatDate(p.stage_date)})` : "";
    return p.type === "add_candidate"
      ? `Kandidaat ${p.first_name} toevoegen aan ${p.vacancy_label}: ${stage}${date}`
      : `${p.first_name} bij ${p.vacancy_label} naar ${stage}${date}`;
  }
  if (p.type === "add_task") {
    return `Actiepunt bij ${p.vacancy_label}: ${p.body}`;
  }
  if (p.type === "complete_task") {
    return `Actiepunt afvinken bij ${p.vacancy_label}: ${p.task_label}`;
  }
  if (p.type === "reschedule_follow_up") {
    return `Opvolging bij ${p.client_name} ("${p.note_label}") verzetten naar ${formatDate(p.follow_up_on)}`;
  }
  if (p.type === "complete_follow_up") {
    return `Opvolging bij ${p.client_name} afronden: "${p.note_label}"`;
  }
  const when = p.follow_up_on ? `, opvolgen ${formatDate(p.follow_up_on)}` : "";
  if (p.type === "add_note") {
    return `Notitie bij ${p.client_name}: ${p.body}${when}`;
  }
  const who = p.contact_name
    ? ` — ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}`
    : "";
  return `Prospect ${p.company_name}${who} [${CLIENT_STATUS_LABELS[p.status]}]${when}`;
}

import { formatDate } from "@/lib/format";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/types";

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
    };

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ApplyResult = { ok: boolean; message: string; href?: string };

export function describeProposal(p: Proposal): string {
  const when = p.follow_up_on ? `, opvolgen ${formatDate(p.follow_up_on)}` : "";
  if (p.type === "add_note") {
    return `Notitie bij ${p.client_name}: ${p.body}${when}`;
  }
  const who = p.contact_name
    ? ` — ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}`
    : "";
  return `Prospect ${p.company_name}${who} [${CLIENT_STATUS_LABELS[p.status]}]${when}`;
}

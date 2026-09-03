"use server";

import { getSessionContext } from "@/utils/supabase/auth";

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type SearchResults = {
  clients: SearchHit[];
  contacts: SearchHit[];
  vacancies: SearchHit[];
  placements: SearchHit[];
  invoices: SearchHit[];
};

const EMPTY: SearchResults = {
  clients: [],
  contacts: [],
  vacancies: [],
  placements: [],
  invoices: [],
};

/**
 * Vrije zoekopdracht over klanten, contactpersonen, vacatures,
 * placements en facturen. RLS beperkt alles al tot de eigen organisatie.
 */
export async function globalSearch(raw: string): Promise<SearchResults> {
  const q = raw.replace(/[,()%*\\]/g, " ").trim();
  if (q.length < 2) return EMPTY;

  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return EMPTY;

  const like = `%${q}%`;

  const [cl, co, va, pl, inv] = await Promise.all([
    supabase.from("clients").select("id, name").ilike("name", like).limit(6),
    supabase
      .from("contacts")
      .select("id, name, role, client_id")
      .or(`name.ilike.${like},email.ilike.${like}`)
      .limit(6),
    supabase
      .from("vacancies")
      .select("id, title, client_id")
      .ilike("title", like)
      .limit(6),
    supabase
      .from("placements")
      .select("id, candidate_name, client_id")
      .ilike("candidate_name", like)
      .limit(6),
    supabase
      .from("invoices")
      .select("id, invoice_number, vacancy_label, client_id")
      .or(`invoice_number.ilike.${like},vacancy_label.ilike.${like}`)
      .limit(6),
  ]);

  // Klantnamen voor de subtitels
  const ids = new Set<string>();
  for (const r of co.data ?? []) ids.add(r.client_id);
  for (const r of va.data ?? []) ids.add(r.client_id);
  for (const r of pl.data ?? []) ids.add(r.client_id);
  for (const r of inv.data ?? []) ids.add(r.client_id);
  const nameById = new Map<string, string>();
  if (ids.size > 0) {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", [...ids]);
    for (const c of data ?? []) nameById.set(c.id, c.name);
  }

  const join = (parts: (string | null | undefined)[], fallback: string) =>
    parts.filter(Boolean).join(" · ") || fallback;

  return {
    clients: (cl.data ?? []).map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: "Klant",
      href: `/klanten/${c.id}`,
    })),
    contacts: (co.data ?? []).map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: join([c.role, nameById.get(c.client_id)], "Contactpersoon"),
      href: `/contactpersonen/${c.id}`,
    })),
    vacancies: (va.data ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      subtitle: nameById.get(v.client_id) ?? "Vacature",
      href: `/vacatures/${v.id}`,
    })),
    placements: (pl.data ?? []).map((p) => ({
      id: p.id,
      title: p.candidate_name ?? "Placement",
      subtitle: nameById.get(p.client_id) ?? "Placement",
      href: `/placements/${p.id}`,
    })),
    invoices: (inv.data ?? []).map((i) => ({
      id: i.id,
      title: i.invoice_number || i.vacancy_label || "(zonder nummer)",
      subtitle: join([nameById.get(i.client_id), i.vacancy_label], "Factuur"),
      href: `/facturen/${i.id}`,
    })),
  };
}

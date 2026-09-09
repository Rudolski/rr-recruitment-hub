"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { checkbox, intOrNull, nullableStr, str } from "@/lib/form";
import { scanAll } from "@/lib/radar/scan";
import { WATCH_KINDS, WATCH_MODES, isOneOf } from "@/lib/types";

export async function scanNow() {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  await scanAll(supabase, { organizationId });
  revalidatePath("/radar");
}

function parseSource(fd: FormData) {
  const kindRaw = str(fd, "kind");
  const modeRaw = str(fd, "mode");
  return {
    kind: isOneOf(WATCH_KINDS, kindRaw) ? kindRaw : "concurrent",
    mode: isOneOf(WATCH_MODES, modeRaw) ? modeRaw : "sitemap",
    name: str(fd, "name"),
    fetch_url: str(fd, "fetch_url"),
    client_id: nullableStr(fd, "client_id"),
    path_filter: nullableStr(fd, "path_filter"),
    link_pattern: nullableStr(fd, "link_pattern"),
    max_pages: Math.min(10, Math.max(1, intOrNull(fd, "max_pages") ?? 1)),
    exclusive_only: checkbox(fd, "exclusive_only"),
  };
}

export async function addSource(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;

  const v = parseSource(fd);
  if (!v.name || !v.fetch_url) return;

  await supabase.from("watch_sources").insert({
    organization_id: organizationId,
    kind: v.kind,
    mode: v.mode,
    name: v.name,
    fetch_url: v.fetch_url,
    client_id: v.kind === "klant" ? v.client_id : null,
    path_filter: v.path_filter,
    link_pattern: v.link_pattern,
    max_pages: v.max_pages,
    exclusive_only: v.exclusive_only,
  });
  revalidatePath("/radar");
}

export async function updateSource(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  if (!id) return;

  const v = parseSource(fd);
  if (!v.name || !v.fetch_url) return;

  await supabase
    .from("watch_sources")
    .update({
      kind: v.kind,
      mode: v.mode,
      name: v.name,
      fetch_url: v.fetch_url,
      client_id: v.kind === "klant" ? v.client_id : null,
      path_filter: v.path_filter,
      link_pattern: v.link_pattern,
      max_pages: v.max_pages,
      exclusive_only: v.exclusive_only,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  revalidatePath("/radar");
}

export async function toggleSource(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const active = str(fd, "active") === "true";
  if (!id) return;

  await supabase
    .from("watch_sources")
    .update({ active: !active })
    .eq("id", id)
    .eq("organization_id", organizationId);
  revalidatePath("/radar");
}

export async function deleteSource(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  if (!id) return;

  await supabase
    .from("watch_sources")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  revalidatePath("/radar");
}

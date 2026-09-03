"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { nullableStr, str } from "@/lib/form";
import type { ClientNote } from "@/lib/types";

function revalidateCrm(clientId?: string) {
  if (clientId) revalidatePath(`/klanten/${clientId}`);
  revalidatePath("/acquisitie");
  revalidatePath("/dashboard");
}

export async function addClientNote(fd: FormData) {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) return;

  const clientId = str(fd, "client_id");
  const body = str(fd, "body");
  if (!clientId || !body) return;

  await supabase.from("client_notes").insert({
    organization_id: organizationId,
    client_id: clientId,
    author_id: user.id,
    body,
    follow_up_on: nullableStr(fd, "follow_up_on"),
  });

  revalidateCrm(clientId);
}

export async function toggleFollowUp(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  const { data: note } = await supabase
    .from("client_notes")
    .select("follow_up_done, client_id")
    .eq("id", id)
    .maybeSingle<Pick<ClientNote, "follow_up_done" | "client_id">>();
  if (!note) return;

  const done = !note.follow_up_done;
  await supabase
    .from("client_notes")
    .update({
      follow_up_done: done,
      follow_up_done_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidateCrm(note.client_id);
}

export async function deleteClientNote(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  const clientId = str(fd, "client_id");
  if (!id) return;

  await supabase.from("client_notes").delete().eq("id", id);
  revalidateCrm(clientId || undefined);
}

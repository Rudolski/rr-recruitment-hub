"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import { str } from "@/lib/form";
import type { StoredFile } from "@/lib/types";

const BUCKET = "files";

function sanitize(name: string) {
  return (
    name
      .replace(/[^\w.\- ]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 120) || "bestand"
  );
}

export async function uploadFile(fd: FormData) {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) return;

  const scope = str(fd, "scope") === "brand" ? "brand" : "client";
  const clientId = scope === "client" ? str(fd, "client_id") : "";
  const label = str(fd, "label") || null;
  const file = fd.get("file");

  if (!(file instanceof File) || file.size === 0) return;
  if (scope === "client" && !clientId) return;

  const folder =
    scope === "brand"
      ? `${organizationId}/brand`
      : `${organizationId}/clients/${clientId}`;
  const path = `${folder}/${Date.now()}-${sanitize(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) return;

  await supabase.from("stored_files").insert({
    organization_id: organizationId,
    uploaded_by: user.id,
    scope,
    client_id: scope === "client" ? clientId : null,
    storage_path: path,
    filename: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    label,
  });

  if (scope === "brand") revalidatePath("/rr-recruitment");
  else revalidatePath(`/klanten/${clientId}`);
}

export async function deleteFile(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  const { data: row } = await supabase
    .from("stored_files")
    .select("*")
    .eq("id", id)
    .maybeSingle<StoredFile>();
  if (!row) return;

  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  await supabase.from("stored_files").delete().eq("id", id);

  if (row.scope === "brand") revalidatePath("/rr-recruitment");
  else if (row.client_id) revalidatePath(`/klanten/${row.client_id}`);
}

export async function openFile(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) redirect("/dashboard");

  const { data: row } = await supabase
    .from("stored_files")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle<Pick<StoredFile, "storage_path">>();
  if (!row) redirect("/dashboard");

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 120);

  redirect(data?.signedUrl ?? "/dashboard");
}

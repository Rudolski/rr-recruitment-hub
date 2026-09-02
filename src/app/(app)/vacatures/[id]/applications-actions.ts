"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { str } from "@/lib/form";
import { APPLICATION_STAGES, isOneOf } from "@/lib/types";

export async function addApplication(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;

  const vacancyId = str(fd, "vacancy_id");
  const candidateId = str(fd, "candidate_id");
  if (!vacancyId || !candidateId) return;

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("vacancy_id", vacancyId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("applications").insert({
      organization_id: organizationId,
      vacancy_id: vacancyId,
      candidate_id: candidateId,
    });
  }

  revalidatePath(`/vacatures/${vacancyId}`);
}

export async function setApplicationStage(fd: FormData) {
  const { supabase } = await getSessionContext();

  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  const stage = str(fd, "stage");
  if (!id || !isOneOf(APPLICATION_STAGES, stage)) return;

  await supabase
    .from("applications")
    .update({ stage, stage_updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/vacatures/${vacancyId}`);
}

export async function removeApplication(fd: FormData) {
  const { supabase } = await getSessionContext();

  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  if (!id) return;

  await supabase.from("applications").delete().eq("id", id);
  revalidatePath(`/vacatures/${vacancyId}`);
}

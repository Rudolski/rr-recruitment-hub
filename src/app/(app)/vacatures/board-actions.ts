"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { nullableStr, str } from "@/lib/form";
import { CANDIDATE_STAGES, isOneOf } from "@/lib/types";

function refresh(vacancyId: string) {
  if (vacancyId) revalidatePath(`/vacatures/${vacancyId}`);
  revalidatePath("/procedures");
}

/* -------------------- Actiepunten -------------------- */

export async function addVacancyTask(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const vacancyId = str(fd, "vacancy_id");
  const body = str(fd, "body").trim();
  if (!vacancyId || !body) return;

  await supabase.from("vacancy_tasks").insert({
    organization_id: organizationId,
    vacancy_id: vacancyId,
    body,
  });
  refresh(vacancyId);
}

export async function toggleVacancyTask(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  if (!id) return;

  const { data: task } = await supabase
    .from("vacancy_tasks")
    .select("done")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle<{ done: boolean }>();
  if (!task) return;

  const done = !task.done;
  await supabase
    .from("vacancy_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("organization_id", organizationId);
  refresh(vacancyId);
}

export async function deleteVacancyTask(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  if (!id) return;

  await supabase
    .from("vacancy_tasks")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  refresh(vacancyId);
}

/* -------------------- Funnel-kandidaten -------------------- */

export async function addVacancyCandidate(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const vacancyId = str(fd, "vacancy_id");
  const firstName = str(fd, "first_name").trim();
  const stageRaw = str(fd, "stage");
  if (!vacancyId || !firstName) return;

  await supabase.from("vacancy_candidates").insert({
    organization_id: organizationId,
    vacancy_id: vacancyId,
    first_name: firstName,
    stage: isOneOf(CANDIDATE_STAGES, stageRaw) ? stageRaw : "intake",
    stage_date: nullableStr(fd, "stage_date"),
  });
  refresh(vacancyId);
}

export async function moveVacancyCandidate(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  const stageRaw = str(fd, "stage");
  if (!id || !isOneOf(CANDIDATE_STAGES, stageRaw)) return;

  // Nieuwe stap = de datum hoort bij de vorige stap; leegmaken.
  await supabase
    .from("vacancy_candidates")
    .update({
      stage: stageRaw,
      stage_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  refresh(vacancyId);
}

/** Datum bij de huidige stap zetten of wissen. */
export async function setCandidateStageDate(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  if (!id) return;

  await supabase
    .from("vacancy_candidates")
    .update({
      stage_date: nullableStr(fd, "stage_date"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  refresh(vacancyId);
}

export async function deleteVacancyCandidate(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  if (!id) return;

  await supabase
    .from("vacancy_candidates")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  refresh(vacancyId);
}

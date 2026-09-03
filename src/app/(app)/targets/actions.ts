"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import { numOrNull, str } from "@/lib/form";

/**
 * Slaat alle 12 maandtargets voor één jaar in één keer op.
 * Lege regels worden verwijderd; ingevulde regels ge-upsert op
 * (organization_id, year, month).
 */
export async function saveYearTargets(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;

  const year = Number(str(fd, "year"));
  if (!Number.isInteger(year)) return;

  const toUpsert: {
    organization_id: string;
    year: number;
    month: number;
    target_revenue: number | null;
    target_placements: null;
  }[] = [];
  const emptyMonths: number[] = [];

  for (let month = 1; month <= 12; month++) {
    const revenue = numOrNull(fd, `revenue_${month}`);
    if (revenue == null) {
      emptyMonths.push(month);
    } else {
      toUpsert.push({
        organization_id: organizationId,
        year,
        month,
        target_revenue: revenue,
        target_placements: null,
      });
    }
  }

  if (toUpsert.length > 0) {
    await supabase
      .from("monthly_targets")
      .upsert(toUpsert, { onConflict: "organization_id,year,month" });
  }
  if (emptyMonths.length > 0) {
    await supabase
      .from("monthly_targets")
      .delete()
      .eq("organization_id", organizationId)
      .eq("year", year)
      .in("month", emptyMonths);
  }

  revalidatePath("/targets");
  redirect(`/targets?jaar=${year}`);
}

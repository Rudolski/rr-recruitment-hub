import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { syncAllEnabled } from "@/lib/snelstart/sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Niet in vercel.json opgenomen als cron: de twee bestaande crons
 * (radar-scan, daily-digest) zijn al wat het Hobby-plan zonder extra
 * kosten toestaat. Synchroniseren gaat voorlopig via de "Nu
 * synchroniseren"-knop op /facturen/snelstart; deze route staat klaar
 * om later alsnog aan een cron te hangen (of aan te haken op de
 * bestaande daily-digest-cron) zodra de koppeling live getest is.
 */
async function run(req: NextRequest) {
  const secret = process.env.RADAR_CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.has("x-vercel-cron");

  const authorized = isVercelCron || (!!secret && auth === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let db;
  try {
    db = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  try {
    const results = await syncAllEnabled(db);
    return NextResponse.json({ ranAt: new Date().toISOString(), results });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

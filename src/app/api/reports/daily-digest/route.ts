import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendDailyDigestIfNotAlreadySentToday } from "@/lib/daily-digest";

export const dynamic = "force-dynamic";

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
    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("id")
      .limit(1)
      .single();
    if (orgError || !org) {
      return NextResponse.json(
        { error: orgError?.message ?? "Geen organisatie gevonden." },
        { status: 500 },
      );
    }
    const result = await sendDailyDigestIfNotAlreadySentToday(db, org.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export function GET(req: NextRequest) {
  return run(req);
}

export function POST(req: NextRequest) {
  return run(req);
}

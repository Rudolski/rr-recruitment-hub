import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { scanAll } from "@/lib/radar/scan";

// De scan kan wat tijd kosten; geef de functie ruimte (Vercel).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  const secret = process.env.RADAR_CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.has("x-vercel-cron");

  const authorized =
    isVercelCron || (!!secret && auth === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let db;
  try {
    db = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }

  try {
    const results = await scanAll(db);
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      sources: results.length,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export function GET(req: NextRequest) {
  return run(req);
}

export function POST(req: NextRequest) {
  return run(req);
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { processNewEmails } from "@/lib/email/process-emails";

export const runtime = "nodejs";
export const maxDuration = 60;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Manual trigger — called directly by the backoffice button.
 * Does not go through the cron endpoint; calls the shared processing
 * logic directly so it works in local dev without Vercel cron.
 */
export async function POST(request: NextRequest) {
  // Verify the user is authenticated
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const serviceClient = getServiceClient();
    const origin = new URL(request.url).origin;

    const results = await processNewEmails(
      serviceClient,
      origin,
      process.env.CRON_SECRET
    );

    const message =
      results.processed === 0
        ? "No active projects found"
        : "Email check completed";

    return NextResponse.json({
      message,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("[CHECK] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to check emails",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

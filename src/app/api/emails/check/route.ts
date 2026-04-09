import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Manual trigger for email check — requires authenticated user.
 * Internally calls the cron endpoint.
 */
export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Call the cron endpoint internally
    const origin = new URL(request.url).origin;
    const cronResponse = await fetch(`${origin}/api/cron/check-emails`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
      },
    });

    const data = await cronResponse.json();
    return NextResponse.json(data, { status: cronResponse.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to trigger email check",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

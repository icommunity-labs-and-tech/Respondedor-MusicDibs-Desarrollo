import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteEmailsByUids } from "@/lib/email/imap";

export const runtime = "nodejs";
export const maxDuration = 30;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const supabaseAuth = await createServerSupabaseClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, action } = await request.json() as { ids: string[]; action: "archive" | "delete" };

  if (!ids?.length || !["archive", "delete"].includes(action)) {
    return NextResponse.json({ error: "ids[] and action required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Fetch UIDs for IMAP operations
  const { data: emails } = await supabase
    .from("emails")
    .select("id, uid")
    .in("id", ids);

  const uids = (emails ?? [])
    .map((e) => e.uid)
    .filter((uid): uid is number => uid !== null);

  if (action === "delete") {
    // Delete from IMAP
    if (uids.length > 0) {
      try {
        await deleteEmailsByUids(uids);
      } catch (err) {
        console.warn("[Bulk] IMAP delete failed, continuing:", err);
      }
    }
    // Hard delete from DB (cascades to drafts)
    const { error } = await supabase.from("emails").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (action === "archive") {
    // Delete from IMAP (archive = remove from server + mark archived in DB)
    if (uids.length > 0) {
      try {
        await deleteEmailsByUids(uids);
      } catch (err) {
        console.warn("[Bulk] IMAP delete failed, continuing:", err);
      }
    }
    // Mark as archived in DB
    const { error } = await supabase
      .from("emails")
      .update({ status: "archived" })
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: ids.length });
}

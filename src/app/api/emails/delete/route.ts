import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteEmailByUid } from "@/lib/email/imap";

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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emailId } = await request.json();
  if (!emailId) {
    return NextResponse.json({ error: "emailId is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Fetch the email to get uid
  const { data: email, error: emailError } = await supabase
    .from("emails")
    .select("id, uid")
    .eq("id", emailId)
    .single();

  if (emailError || !email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Delete from IMAP server if we have the UID
  if (email.uid) {
    try {
      await deleteEmailByUid(email.uid);
    } catch (err) {
      console.warn("[Delete] IMAP delete failed, continuing with DB delete:", err);
      // Non-fatal: still delete from DB
    }
  }

  // Hard delete from Supabase (cascades to drafts via FK)
  const { error: deleteError } = await supabase
    .from("emails")
    .delete()
    .eq("id", emailId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

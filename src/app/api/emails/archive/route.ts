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

  const { data: email, error: emailError } = await supabase
    .from("emails")
    .select("id, uid, status")
    .eq("id", emailId)
    .single();

  if (emailError || !email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Delete from IMAP server if we have a UID (may not exist for sent-only emails)
  if (email.uid) {
    try {
      await deleteEmailByUid(email.uid);
    } catch (err) {
      console.warn("[Archive] IMAP delete failed, continuing with DB update:", err);
      // Non-fatal: still archive in DB even if IMAP delete fails
    }
  }

  // Mark as archived in DB
  const { error: updateError } = await supabase
    .from("emails")
    .update({ status: "archived" })
    .eq("id", emailId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

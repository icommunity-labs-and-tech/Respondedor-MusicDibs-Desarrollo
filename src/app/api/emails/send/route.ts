import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/smtp";

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
  // Require authenticated user (only humans can send)
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { emailId, draftId, content } = body;

  if (!emailId || !content) {
    return NextResponse.json(
      { error: "emailId and content are required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  try {
    // 1. Fetch the original email
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("*")
      .eq("id", emailId)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: `Email not found: ${emailError?.message || "Unknown"}` },
        { status: 404 }
      );
    }

    // Prevent double-sending
    if (email.status === "sent") {
      return NextResponse.json(
        { error: "This email has already been responded to" },
        { status: 409 }
      );
    }

    // 2. Send the email via SMTP
    const result = await sendEmail({
      to: email.from_address,
      subject: email.subject,
      text: content,
      inReplyTo: email.message_id,
      references: email.message_id,
    });

    // 3. Update draft with final content and sent timestamp
    if (draftId) {
      await supabase
        .from("drafts")
        .update({
          edited_response: content,
          sent_at: new Date().toISOString(),
        })
        .eq("id", draftId);
    } else {
      // If no draft existed, create one with the sent content
      await supabase.from("drafts").upsert(
        {
          email_id: emailId,
          project_id: email.project_id,
          ai_response: content,
          edited_response: content,
          sent_at: new Date().toISOString(),
          model_used: "manual",
        },
        { onConflict: "email_id" }
      );
    }

    // 4. Update email status to sent
    await supabase
      .from("emails")
      .update({ status: "sent" })
      .eq("id", emailId);

    return NextResponse.json({
      message: "Email sent successfully",
      messageId: result.messageId,
      accepted: result.accepted,
    });
  } catch (error) {
    console.error("[SMTP] Send error:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

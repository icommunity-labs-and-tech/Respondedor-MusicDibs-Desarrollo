import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateEmailResponse } from "@/lib/ai/claude";
import { generateEmailResponseGemini } from "@/lib/ai/gemini";
import { loadProjectContext } from "@/lib/ai/context-loader";

export const runtime = "nodejs";
export const maxDuration = 30;
// Force US East region so Gemini API calls originate from a US IP
// (Gemini API has 0 free credits in Spain/EU — bypassed by running server-side from US)
export const preferredRegion = ["iad1"];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  // Auth: accept either authenticated user or cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  let authorized = false;

  // Check cron secret
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  }

  // Check user auth
  if (!authorized) {
    try {
      const supabaseUser = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabaseUser.auth.getUser();
      if (user) authorized = true;
    } catch {
      // Not authenticated via user session
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request
  const body = await request.json();
  const { emailId, provider = "claude" } = body; // provider: "claude" | "gemini"

  if (!emailId) {
    return NextResponse.json(
      { error: "emailId is required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  try {
    // 1. Fetch the email with its project
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("*, projects(*)")
      .eq("id", emailId)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: `Email not found: ${emailError?.message || "Unknown"}` },
        { status: 404 }
      );
    }

    const project = email.projects;
    if (!project) {
      return NextResponse.json(
        { error: "Project not found for this email" },
        { status: 404 }
      );
    }

    // 2. Load project context: static .md + dynamic Supabase Q&A entries
    const context = await loadProjectContext(project.context_file, project.id);

    // 3. Generate AI response
    const emailBody = email.body_text || email.body_html || "(Sin contenido)";
    // Strip HTML tags if we only have HTML body
    const cleanBody = email.body_text
      ? email.body_text
      : emailBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const aiParams = {
      emailSubject: email.subject,
      emailBody: cleanBody,
      senderName: email.from_name || email.from_address,
      senderEmail: email.from_address,
      projectContext: context,
      projectName: project.name,
      replyFromEmail: project.email_address,
    };

    const result = provider === "gemini"
      ? await generateEmailResponseGemini(aiParams)
      : await generateEmailResponse(aiParams);

    // 4. Save draft to database (upsert — regeneration overwrites existing draft)
    const { data: draft, error: draftError } = await supabase
      .from("drafts")
      .upsert(
        {
          email_id: emailId,
          project_id: project.id,
          ai_response: result.response,
          edited_response: result.response, // starts as copy of AI response
          model_used: result.model,
          tokens_used: result.tokensUsed,
        },
        { onConflict: "email_id" }
      )
      .select()
      .single();

    if (draftError) {
      return NextResponse.json(
        { error: `Error saving draft: ${draftError.message}` },
        { status: 500 }
      );
    }

    // 5. Update email status to draft_ready
    await supabase
      .from("emails")
      .update({ status: "draft_ready" })
      .eq("id", emailId);

    return NextResponse.json({
      message: "Draft generated successfully",
      draft: {
        id: draft.id,
        model: result.model,
        tokensUsed: result.tokensUsed,
      },
    });
  } catch (error) {
    console.error("[AI] Generation error:", error);
    return NextResponse.json(
      {
        error: "AI generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

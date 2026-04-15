import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { improveEmailResponse } from "@/lib/ai/claude";
import { loadProjectContext } from "@/lib/ai/context-loader";

export const runtime = "nodejs";
export const maxDuration = 30;
export const preferredRegion = ["iad1"];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  // Auth check
  try {
    const supabaseUser = await createServerSupabaseClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { emailId, currentContent } = body;

  if (!emailId || !currentContent?.trim()) {
    return NextResponse.json({ error: "emailId and currentContent are required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    // Fetch email + project
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("*, projects(*)")
      .eq("id", emailId)
      .single();

    if (emailError || !email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const project = email.projects;
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch existing draft id
    const { data: draft } = await supabase
      .from("drafts")
      .select("id")
      .eq("email_id", emailId)
      .single();

    if (!draft) {
      return NextResponse.json({ error: "No draft found to improve" }, { status: 404 });
    }

    const context = await loadProjectContext(project.context_file, project.id);
    const emailBody = email.body_text
      ? email.body_text
      : (email.body_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const result = await improveEmailResponse({
      emailSubject: email.subject,
      emailBody,
      senderName: email.from_name || email.from_address,
      senderEmail: email.from_address,
      projectContext: context,
      projectName: project.name,
      currentDraft: currentContent,
    });

    // Save improved version as edited_response
    const { error: updateError } = await supabase
      .from("drafts")
      .update({
        edited_response: result.response,
        model_used: result.model,
        tokens_used: result.tokensUsed,
      })
      .eq("id", draft.id);

    if (updateError) {
      return NextResponse.json({ error: `Error saving: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Draft improved", improved: result.response });
  } catch (error) {
    console.error("[AI] Improve error:", error);
    return NextResponse.json(
      { error: "AI improvement failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

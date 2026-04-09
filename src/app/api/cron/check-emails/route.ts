import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchNewEmails } from "@/lib/email/imap";

// Service role client for server-side operations (bypasses RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Pro: up to 60s for cron

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const results = {
    processed: 0,
    newEmails: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get all active projects with email accounts
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*, email_accounts(*)")
      .eq("status", "active");

    if (projectsError) {
      throw new Error(`Error fetching projects: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: "No active projects found",
        ...results,
      });
    }

    // 2. For each active project, fetch new emails
    for (const project of projects) {
      try {
        // Get the last UID we processed for this project
        const { data: lastEmail } = await supabase
          .from("emails")
          .select("uid")
          .eq("project_id", project.id)
          .order("uid", { ascending: false })
          .limit(1)
          .single();

        const lastUid = lastEmail?.uid || 0;

        // Fetch new emails from IMAP
        const newEmails = await fetchNewEmails(lastUid);

        // 3. Insert new emails into database (skip duplicates via message_id unique constraint)
        for (const email of newEmails) {
          try {
            const { data: inserted, error: insertError } = await supabase
              .from("emails")
              .upsert(
                {
                  project_id: project.id,
                  message_id: email.messageId,
                  uid: email.uid,
                  from_address: email.from.address,
                  from_name: email.from.name || null,
                  to_address: email.to,
                  subject: email.subject,
                  body_text: email.textBody,
                  body_html: email.htmlBody,
                  received_at: email.date.toISOString(),
                  status: "pending",
                },
                { onConflict: "message_id", ignoreDuplicates: true }
              )
              .select("id")
              .single();

            if (insertError) {
              // Duplicate — skip silently
              if (insertError.code === "23505") continue;
              results.errors.push(
                `Error inserting email ${email.messageId}: ${insertError.message}`
              );
              continue;
            }

            if (inserted) {
              results.newEmails++;

              // 4. Trigger AI draft generation for this email
              try {
                const aiResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(request.url).origin : "http://localhost:3000"}/api/ai/generate`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      // Pass cron secret for internal auth
                      Authorization: `Bearer ${cronSecret}`,
                    },
                    body: JSON.stringify({ emailId: inserted.id }),
                  }
                );

                if (!aiResponse.ok) {
                  const errData = await aiResponse.json().catch(() => ({}));
                  results.errors.push(
                    `AI generation failed for ${inserted.id}: ${errData.error || aiResponse.statusText}`
                  );
                }
              } catch (aiErr) {
                results.errors.push(
                  `AI generation error for ${inserted.id}: ${aiErr instanceof Error ? aiErr.message : "Unknown"}`
                );
              }
            }
          } catch (emailErr) {
            results.errors.push(
              `Error processing email ${email.messageId}: ${emailErr instanceof Error ? emailErr.message : "Unknown"}`
            );
          }
        }

        results.processed++;
      } catch (projectErr) {
        results.errors.push(
          `Error processing project ${project.name}: ${projectErr instanceof Error ? projectErr.message : "Unknown"}`
        );
      }
    }

    return NextResponse.json({
      message: "Email check completed",
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("[CRON] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

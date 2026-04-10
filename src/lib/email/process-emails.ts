import { SupabaseClient } from "@supabase/supabase-js";
import { fetchNewEmails } from "./imap";

export interface ProcessResult {
  processed: number;
  newEmails: number;
  errors: string[];
}

/**
 * Core email processing logic.
 * Fetches new emails from IMAP and inserts them into Supabase.
 * Called directly — no HTTP round-trips.
 *
 * @param supabase  Service-role client (bypasses RLS)
 * @param origin    Base URL for internal AI generation calls (e.g. http://localhost:3000)
 * @param authToken Token to pass to the AI endpoint (cron secret or session token)
 */
export async function processNewEmails(
  supabase: SupabaseClient,
  origin: string,
  authToken?: string
): Promise<ProcessResult> {
  const results: ProcessResult = { processed: 0, newEmails: 0, errors: [] };

  // 1. Get all active projects
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*, email_accounts(*)")
    .eq("status", "active");

  if (projectsError) {
    throw new Error(`Error fetching projects: ${projectsError.message}`);
  }

  if (!projects || projects.length === 0) {
    return results;
  }

  // 2. Process each project
  for (const project of projects) {
    try {
      // Get the last UID already stored for this project
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

      // 3. Upsert each email into the database
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
                in_reply_to: email.inReplyTo,
                received_at: email.date.toISOString(),
                status: "pending",
              },
              { onConflict: "message_id", ignoreDuplicates: true }
            )
            .select("id")
            .single();

          if (insertError) {
            if (insertError.code === "23505") continue; // duplicate — skip
            results.errors.push(
              `Error inserting email ${email.messageId}: ${insertError.message}`
            );
            continue;
          }

          if (inserted) {
            results.newEmails++;

            // 4. Trigger AI draft generation
            try {
              const aiResponse = await fetch(`${origin}/api/ai/generate`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({ emailId: inserted.id }),
              });

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
      console.error(`[EMAIL] Project ${project.name} error:`, projectErr);
      results.errors.push(
        `Error processing project ${project.name}: ${projectErr instanceof Error ? projectErr.message : "Unknown"}`
      );
    }
  }

  return results;
}

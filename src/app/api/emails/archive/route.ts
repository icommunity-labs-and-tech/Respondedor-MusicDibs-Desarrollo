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

/**
 * Collects all email IDs in the same thread as the given email.
 * Traverses UP (in_reply_to) to find the root, then DOWN (BFS) to collect all descendants.
 */
function collectThreadIds(
  targetMessageId: string,
  targetInReplyTo: string | null,
  allEmails: Array<{ id: string; message_id: string; in_reply_to: string | null; uid: number | null }>
): string[] {
  // Build a map for fast lookup
  const byMessageId = new Map(allEmails.map((e) => [e.message_id, e]));

  // Walk UP to find thread root
  let rootMessageId = targetMessageId;
  let current = byMessageId.get(targetMessageId);

  // If the target itself has in_reply_to, walk up
  let inReplyTo = targetInReplyTo;
  while (inReplyTo) {
    const parent = byMessageId.get(inReplyTo);
    if (!parent) break;
    rootMessageId = parent.message_id;
    inReplyTo = parent.in_reply_to;
    current = parent;
  }

  // BFS from root to collect all thread members
  const threadIds: string[] = [];
  const visited = new Set<string>();
  const queue = [rootMessageId];

  while (queue.length > 0) {
    const msgId = queue.shift()!;
    if (visited.has(msgId)) continue;
    visited.add(msgId);

    const email = byMessageId.get(msgId);
    if (email) {
      threadIds.push(email.id);
    }

    // Find all direct replies to this message
    const replies = allEmails.filter((e) => e.in_reply_to === msgId);
    for (const reply of replies) {
      queue.push(reply.message_id);
    }
  }

  return threadIds;
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

  // Fetch the target email
  const { data: email, error: emailError } = await supabase
    .from("emails")
    .select("id, uid, status, message_id, in_reply_to, project_id")
    .eq("id", emailId)
    .single();

  if (emailError || !email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Fetch ALL emails in this project to traverse the thread
  const { data: projectEmails } = await supabase
    .from("emails")
    .select("id, uid, message_id, in_reply_to")
    .eq("project_id", email.project_id);

  const allEmails = projectEmails ?? [];

  // Collect all IDs in the thread
  const threadEmailIds = collectThreadIds(
    email.message_id,
    email.in_reply_to,
    allEmails
  );

  // Get UIDs for all thread emails that have one
  const threadEmails = allEmails.filter((e) => threadEmailIds.includes(e.id));
  const uidsToDelete = threadEmails
    .map((e) => e.uid)
    .filter((uid): uid is number => uid !== null);

  // Delete all thread UIDs from IMAP in one connection
  if (uidsToDelete.length > 0) {
    try {
      await deleteEmailsByUids(uidsToDelete);
    } catch (err) {
      console.warn("[Archive] IMAP batch delete failed, continuing with DB update:", err);
      // Non-fatal: still archive in DB even if IMAP delete fails
    }
  }

  // Mark ALL thread emails as archived in DB
  const { error: updateError } = await supabase
    .from("emails")
    .update({ status: "archived" })
    .in("id", threadEmailIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    archivedCount: threadEmailIds.length,
  });
}

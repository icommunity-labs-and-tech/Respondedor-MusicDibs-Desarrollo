import { SupabaseClient } from "@supabase/supabase-js";
import type { ThreadMessage } from "@/types/database";

/**
 * Builds a thread by walking the message_id / in_reply_to chain.
 * Never groups by subject — avoids false positives with generic subjects.
 */
export async function loadEmailThread(
  supabase: SupabaseClient,
  email: { id: string; project_id: string; message_id: string | null; in_reply_to: string | null },
): Promise<ThreadMessage[]> {
  // 1. Fetch all lightweight email records in this project to resolve the chain
  const { data: allRaw } = await supabase
    .from("emails")
    .select("id, message_id, in_reply_to")
    .eq("project_id", email.project_id);

  if (!allRaw || allRaw.length === 0) return [];

  const byMsgId = new Map(allRaw.filter((e) => e.message_id).map((e) => [e.message_id!, e]));

  // 2. Walk UP in_reply_to chain to find the thread root
  let rootMsgId: string | null = email.message_id;
  let cursor: string | null = email.in_reply_to;
  while (cursor) {
    const parent = byMsgId.get(cursor);
    if (!parent) break; // parent not in DB — stop here
    rootMsgId = parent.message_id;
    cursor = parent.in_reply_to;
  }

  if (!rootMsgId) {
    // No message_id at all — fall back to just this email
    const { data } = await supabase
      .from("emails")
      .select("*, drafts!drafts_email_id_fkey(*)")
      .eq("id", email.id)
      .single();
    if (!data) return [];
    return [{ type: "received", email: data }];
  }

  // 3. BFS from root to collect all thread member IDs
  const threadIds: string[] = [];
  const queue = [rootMsgId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const msgId = queue.shift()!;
    if (visited.has(msgId)) continue;
    visited.add(msgId);

    const node = byMsgId.get(msgId);
    if (node) {
      threadIds.push(node.id);
      // Find all direct replies
      const replies = allRaw.filter((e) => e.in_reply_to === msgId);
      for (const r of replies) {
        if (r.message_id) queue.push(r.message_id);
      }
    }
  }

  // 4. Fetch full data for thread members
  const { data: fullEmails } = await supabase
    .from("emails")
    .select("*, drafts!drafts_email_id_fkey(*)")
    .in("id", threadIds)
    .order("received_at", { ascending: true });

  if (!fullEmails) return [];

  return fullEmails.flatMap((e) => {
    const draft = Array.isArray(e.drafts)
      ? e.drafts[0] ?? null
      : e.drafts ?? null;

    const received: ThreadMessage = { type: "received", email: e };
    if (e.status === "sent" && draft) {
      return [received, { type: "sent", email: e, draft } as ThreadMessage];
    }
    return [received];
  });
}

import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const steps: Record<string, unknown> = {};

  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || "993"),
    secure: process.env.IMAP_TLS === "true",
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASSWORD!,
    },
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  try {
    await client.connect();
    steps.connect = "OK";

    const lock = await client.getMailboxLock("INBOX");
    steps.selectInbox = { exists: client.mailbox?.exists };

    try {
      const seqNums = await client.search({ seen: false });
      steps.search = { seqNums };

      if (seqNums.length > 0) {
        const one = String(seqNums[0]);
        steps.fetchingSeq = one;

        // Try fetching just ONE message envelope, no body
        for await (const msg of client.fetch(one, { uid: true, envelope: true })) {
          steps.fetchResult = {
            uid: msg.uid,
            seq: msg.seq,
            subject: msg.envelope?.subject,
          };
          break; // only first one
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    steps.logout = "OK";

    return NextResponse.json({ ok: true, steps });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      steps,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : null,
    });
  }
}

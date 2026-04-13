import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface RawEmail {
  messageId: string;
  inReplyTo: string | null;
  uid: number;
  from: { address: string; name: string };
  to: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  date: Date;
}

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

function getImapConfig(): ImapConfig {
  return {
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || "993"),
    user: process.env.IMAP_USER!,
    password: process.env.IMAP_PASSWORD!,
    tls: process.env.IMAP_TLS === "true",
  };
}

/**
 * Fetches unseen emails from INBOX.
 * Uses fetchOne() per message to avoid async-iterator issues in Next.js runtime.
 */
export async function fetchNewEmails(lastUid?: number): Promise<RawEmail[]> {
  const config = getImapConfig();
  const emails: RawEmail[] = [];

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: {
      user: config.user,
      pass: config.password,
    },
    // Allow self-signed / reseller SSL certs (common on cPanel/Plesk)
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {
      // Get sequence numbers of unseen messages (no uid option = seq nums)
      const searchResult = await client.search({ seen: false });
      const seqNums: number[] = searchResult === false ? [] : searchResult;

      for (const seq of seqNums) {
        try {
          // Fetch envelope + uid for this single message
          const message = await client.fetchOne(String(seq), {
            uid: true,
            envelope: true,
          });

          if (!message || message === false || !message.envelope) continue;

          // Skip if already stored (by uid)
          if (lastUid && lastUid > 0 && message.uid <= lastUid) continue;

          const envelope = message.envelope;
          const messageId =
            envelope.messageId || `generated-${message.uid}-${Date.now()}`;

          // Download full RFC 5322 source and parse with mailparser
          let textBody: string | null = null;
          let htmlBody: string | null = null;
          let inReplyTo: string | null = null;

          try {
            const dl = await client.download(String(seq), undefined, {
              uid: false,
            });
            if (dl && dl !== false && dl.content) {
              const chunks: Buffer[] = [];
              for await (const chunk of dl.content) {
                chunks.push(Buffer.from(chunk));
              }
              const rawMessage = Buffer.concat(chunks);
              const parsed = await simpleParser(rawMessage);
              htmlBody = parsed.html || null;
              textBody = parsed.text || null;
              inReplyTo = (parsed.inReplyTo as string | undefined) || null;
            }
          } catch {
            textBody = "(No se pudo descargar el contenido)";
          }

          emails.push({
            messageId,
            inReplyTo,
            uid: message.uid,
            from: {
              address: envelope.from?.[0]?.address || "unknown@unknown.com",
              name: envelope.from?.[0]?.name || "",
            },
            to: envelope.to?.[0]?.address || config.user,
            subject: envelope.subject || "(Sin asunto)",
            textBody,
            htmlBody,
            date: envelope.date || new Date(),
          });
        } catch (msgErr) {
          console.error(`[IMAP] Error fetching seq ${seq}:`, msgErr);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error("[IMAP] Fatal error:", error);
    try {
      await client.logout();
    } catch {
      // ignore
    }
    throw error;
  }

  return emails;
}

/**
 * Deletes an email from the IMAP server by UID.
 * Marks as \Deleted and expunges to permanently remove it.
 */
export async function deleteEmailByUid(uid: number): Promise<void> {
  return deleteEmailsByUids([uid]);
}

/**
 * Deletes multiple emails from the IMAP server in a single connection.
 * Used when archiving a full thread to avoid opening one connection per message.
 */
export async function deleteEmailsByUids(uids: number[]): Promise<void> {
  if (uids.length === 0) return;

  const config = getImapConfig();

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: {
      user: config.user,
      pass: config.password,
    },
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Delete all UIDs in one IMAP command using a UID set
      for (const uid of uids) {
        try {
          await client.messageDelete({ uid }, { uid: true });
        } catch (err) {
          // Non-fatal per UID: message may already be gone
          console.warn(`[IMAP] Could not delete UID ${uid}:`, err);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error("[IMAP] Batch delete error:", error);
    try { await client.logout(); } catch { /* ignore */ }
    throw error;
  }
}

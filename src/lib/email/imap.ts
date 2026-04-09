import { ImapFlow } from "imapflow";

export interface RawEmail {
  messageId: string;
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
 * Fetches unread/unseen emails from the INBOX via IMAP.
 * Returns parsed email objects ready for database insertion.
 */
export async function fetchNewEmails(
  lastUid?: number
): Promise<RawEmail[]> {
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
    logger: false,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for unseen messages, or messages after lastUid
      let searchCriteria: Record<string, unknown>;
      if (lastUid && lastUid > 0) {
        searchCriteria = { uid: `${lastUid + 1}:*` };
      } else {
        searchCriteria = { unseen: true };
      }

      // Fetch messages matching criteria
      for await (const message of client.fetch(searchCriteria, {
        uid: true,
        envelope: true,
        source: false,
        bodyStructure: true,
      })) {
        if (!message.envelope) continue;

        const envelope = message.envelope;
        const messageId =
          envelope.messageId || `generated-${message.uid}-${Date.now()}`;

        // Get the full body content
        let textBody: string | null = null;
        let htmlBody: string | null = null;

        try {
          // Download text part
          const textContent = await client.download(
            String(message.seq),
            undefined,
            { uid: false }
          );
          if (textContent && textContent.content) {
            const chunks: Buffer[] = [];
            for await (const chunk of textContent.content) {
              chunks.push(Buffer.from(chunk));
            }
            const fullContent = Buffer.concat(chunks).toString("utf-8");

            // Try to extract text and HTML parts
            if (textContent.meta?.contentType?.includes("text/html")) {
              htmlBody = fullContent;
            } else {
              textBody = fullContent;
            }
          }
        } catch {
          // If download fails, try to get content from bodyStructure
          textBody = "(No se pudo descargar el contenido)";
        }

        const fromAddress =
          envelope.from?.[0]?.address || "unknown@unknown.com";
        const fromName = envelope.from?.[0]?.name || "";
        const toAddress =
          envelope.to?.[0]?.address || config.user;

        emails.push({
          messageId,
          uid: message.uid,
          from: { address: fromAddress, name: fromName },
          to: toAddress,
          subject: envelope.subject || "(Sin asunto)",
          textBody,
          htmlBody,
          date: envelope.date || new Date(),
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error("[IMAP] Error fetching emails:", error);
    // Ensure we disconnect even on error
    try {
      await client.logout();
    } catch {
      // ignore logout errors
    }
    throw error;
  }

  return emails;
}

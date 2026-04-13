import { ImapFlow } from './node_modules/imapflow/lib/imap-flow.js';
const client = new ImapFlow({
  host: 'mail.musicdibs.com', port: 993, secure: true,
  auth: { user: 'info@musicdibs.com', pass: 'IeHP23@#.t2' },
  tls: { rejectUnauthorized: false },
  logger: false,
});
try {
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const uids = await client.search({ seen: false }, { uid: true });
    console.log('UIDs found:', uids);
    if (uids.length > 0) {
      const testUids = uids.slice(0, 1);
      console.log('Fetching UID:', testUids);
      for await (const msg of client.fetch(testUids, { uid: true, envelope: true, bodyStructure: true }, { uid: true })) {
        console.log('Message UID:', msg.uid, '| Subject:', msg.envelope?.subject);
        try {
          const dl = await client.download(String(msg.uid), undefined, { uid: true });
          const chunks = [];
          for await (const chunk of dl.content) chunks.push(chunk);
          console.log('Body size:', Buffer.concat(chunks).length, 'bytes');
        } catch(de) {
          console.error('Download error:', de.message);
        }
      }
    }
  } finally { lock.release(); }
  await client.logout();
  console.log('Done OK');
} catch(e) {
  console.error('ERROR:', e.message, '| responseText:', e.responseText, '| code:', e.code);
}

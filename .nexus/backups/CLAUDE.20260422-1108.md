## Quick Start

```bash
npm run dev    # Dev server → http://localhost:3000
npm run build  # Production build
npm run lint   # ESLint check
```

## Architecture

**Stack:** Next.js 16 App Router · Supabase (PostgreSQL + Auth + Storage) · Anthropic Claude SDK · Google Gemini SDK · ImapFlow + Nodemailer · Tailwind CSS

```
src/
├── app/
│   ├── (auth)/login/          # Auth pages
│   ├── (dashboard)/
│   │   ├── inbox/page.tsx     # Main inbox (email list + detail + draft editor)
│   │   ├── sent/              # Sent emails view
│   │   ├── archived/          # Emails archivados (status=archived)
│   │   ├── favoritos/         # Emails marcados como favorito
│   │   └── settings/          # IMAP/SMTP config per project
│   └── api/
│       ├── ai/generate/       # POST → generate AI draft via Claude o Gemini
│       ├── ai/improve/        # POST → improve/rewrite existing draft
│       ├── emails/send/       # POST → send via SMTP
│       ├── emails/check/      # POST → trigger IMAP fetch
│       ├── emails/archive/    # POST → archive thread (BFS collectThreadIds)
│       ├── emails/delete/     # POST → delete email + IMAP UID removal
│       ├── emails/bulk/       # POST → bulk status operations
│       └── cron/check-emails/ # Cron endpoint for periodic fetch
├── components/
│   ├── email/                 # EmailList, EmailDetail, DraftEditor, SentDetail
│   ├── layout/                # Shell, sidebar, nav components
│   └── ui/                    # Shared UI primitives
├── lib/
│   ├── ai/claude.ts           # Anthropic SDK wrapper (multimodal: imágenes + PDFs)
│   ├── ai/gemini.ts           # Google Gemini SDK wrapper
│   ├── ai/context-loader.ts   # Fusiona contexts/*.md + knowledge_qa de Supabase
│   ├── email/imap.ts          # ImapFlow fetch logic (extrae adjuntos vía simpleParser)
│   ├── email/smtp.ts          # Nodemailer send logic
│   ├── email/process-emails.ts # Orquesta fetch → DB → Storage → AI draft
│   └── supabase/              # Client/server/middleware helpers
├── types/database.ts          # Typed DB schema
└── contexts/                  # Static markdown context per project (musicdibs.md, privaro.md)
```

## Database Schema (Supabase)

```
projects          id, name, imap_host/port/user/pass, smtp_*, from_email, project_id(FK)
emails            id, project_id, uid, message_id, in_reply_to, from_address, from_name, to_address,
                  subject, body_text, body_html, status, received_at
drafts            id, email_id(UNIQUE FK), ai_response, edited_response, model_used, tokens_used
email_attachments id, email_id(FK), filename, content_type, storage_path, size, extracted_text, created_at
knowledge_qa      id, project_id, question, answer, category, created_at
```

**RLS:** All tables use `USING (true)` for `authenticated` role.

**Storage:** Bucket `email-attachments` (privado, 10MB/file). Tipos admitidos: JPEG, PNG, GIF, WebP, PDF. Ruta: `{email_id}/{filename}`.

**Supabase project_id:** `skprvlhzbnwlhsslvqfg` (eu-west-2).

## Environment

Required in `.env.local` (y en Vercel → Settings → Environment Variables):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
IMAP_HOST=
IMAP_PORT=993
IMAP_USER=
IMAP_PASSWORD=
IMAP_TLS=true
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
CRON_SECRET=
```

## Gotchas

- **PostgREST FK hint requerido en TODAS las queries con drafts:** tanto `inbox/page.tsx` como `sent/page.tsx` necesitan `select("*, drafts!drafts_email_id_fkey(*)")`. Normalize debe manejar objeto directo Y array: `Array.isArray(d) ? d[0] ?? null : d ?? null`.
- **Stale closures en useCallback:** usar `useRef` para acceder a `selectedEmail` dentro de `loadEmails` sin ponerlo en el deps array (causaría re-creación del callback en cada selección).
- **mailparser en Next.js:** añadir `imapflow`, `nodemailer`, `mailparser` a `serverExternalPackages` en `next.config.ts` o webpack los bundlea y falla.
- **ImapFlow download:** `client.download(seq)` devuelve el mensaje RFC 5322 completo (headers + body). Usar `simpleParser` de mailparser para extraer `html`/`text` y `attachments` correctamente.
- **ImapFlow tipos — `false | T`:** `client.search()`, `client.fetchOne()`, `client.download()` y `client.mailbox` devuelven `false | T`. El optional chaining `?.` no hace narrowing desde `false`. Usar siempre narrowing explícito: `const result = await client.search(...); const uids = result === false ? [] : result;` y `if (!message || !message.envelope) continue;`. TypeScript falla en build (Vercel) aunque `next dev` pase sin errores.
- **ImapFlow — búsqueda por UID, no por `seen`:** `imap.ts` usa `client.search({ uid: "N:*" }, { uid: true })` para obtener todos los mensajes con UID ≥ lastUid+1, independientemente de si están leídos. NO usar `{ seen: false }` — causa que emails ya leídos en otro cliente se pierdan permanentemente. El deduplicado se garantiza via `onConflict: "message_id"` en Supabase. IMAP wildcard `*` puede devolver el último mensaje aunque sea < uidFrom; añadir safety check `if (message.uid < uidFrom) continue;`.
- **Adjuntos multimodal — tipos soportados:** `SUPPORTED_AI_TYPES` en `process-emails.ts` filtra qué adjuntos se suben a Storage y pasan a Claude. Solo imagen/* y application/pdf. Claude los recibe como `image` blocks (base64) o `document` blocks (PDF). Word/Excel no son soportados nativamente por la API de Claude.
- **Git en Windows (MCP PowerShell):** Los comandos git cuelgan si se ejecutan directamente. Usar siempre `Start-Job` con `-Timeout` y `Receive-Job`. Para index corrupto: `Remove-Item .git\index -Force` + `Remove-Item .git\index.lock -Force` desde PowerShell.
- **Vercel "Redeploy" reutiliza el commit antiguo:** El botón Redeploy en el dashboard de Vercel redeploya el mismo commit, no el último de main. Para deployar código nuevo: hacer push o `git commit --allow-empty -m "chore: trigger deploy" && git push`.
- **Vercel runtime filesystem:** Read-only en producción. Nunca intentar `fs.writeFile` en `process.cwd()` desde una serverless function. Datos dinámicos → Supabase.
- **Gemini API en España/EU:** Restringido con 0 créditos en free tier (quota literal = 0). Fix: `export const preferredRegion = ["iad1"]` en la route que hace la llamada (fuerza ejecución en US East). Requiere billing activo en Google Cloud.
- **Archive de hilo completo:** BFS via `message_id`/`in_reply_to` desde root para encontrar todos los mensajes. Ver `src/app/api/emails/archive/route.ts → collectThreadIds()`.
- **context-loader.ts:** Fusiona fichero estático `contexts/*.md` + últimas 50 entradas de `knowledge_qa` en Supabase. Siempre pasar `projectId` al llamar `loadProjectContext()`.
- **Debug endpoint:** `src/app/api/debug/imap/route.ts` es temporal, no deployar a producción.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- Nunca darme excesivas explicaciones, irme indicando que se va haciendo pero siendo lo más escueto posible para gastar los menos tokens posibles dentro de lo razonable.

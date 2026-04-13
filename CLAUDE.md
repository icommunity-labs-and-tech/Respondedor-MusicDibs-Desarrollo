## Quick Start

```bash
npm run dev    # Dev server → http://localhost:3000
npm run build  # Production build
npm run lint   # ESLint check
```

## Architecture

**Stack:** Next.js 16 App Router · Supabase (PostgreSQL + Auth) · Anthropic Claude SDK · ImapFlow + Nodemailer · Tailwind CSS

```
src/
├── app/
│   ├── (auth)/login/          # Auth pages
│   ├── (dashboard)/
│   │   ├── inbox/page.tsx     # Main inbox (email list + detail + draft editor)
│   │   ├── sent/              # Sent emails view
│   │   ├── archived/          # Emails archivados (status=archived)
│   │   └── settings/          # IMAP/SMTP config per project
│   └── api/
│       ├── ai/generate/       # POST → generate AI draft via Claude
│       ├── emails/send/       # POST → send via SMTP
│       ├── emails/check/      # POST → trigger IMAP fetch
│       └── cron/check-emails/ # Cron endpoint for periodic fetch
├── components/email/          # EmailList, EmailDetail, DraftEditor, SentDetail
├── lib/
│   ├── ai/claude.ts           # Anthropic SDK wrapper
│   ├── email/imap.ts          # ImapFlow fetch logic
│   ├── email/smtp.ts          # Nodemailer send logic
│   └── supabase/              # Client/server/middleware helpers
└── types/database.ts          # Typed DB schema
```

## Database Schema (Supabase)

```
projects    id, name, imap_host/port/user/pass, smtp_*, from_email, project_id(FK)
emails      id, project_id, subject, from_email, body_text, body_html, status, received_at, message_id
drafts      id, email_id(UNIQUE FK), ai_response, edited_response, model_used, tokens_used
```

**RLS:** All tables use `USING (true)` for `authenticated` role.

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
- **ImapFlow download:** `client.download(seq)` devuelve el mensaje RFC 5322 completo (headers + body). Usar `simpleParser` de mailparser para extraer `html`/`text` correctamente.
- **Debug endpoint:** `src/app/api/debug/imap/route.ts` es temporal, no deployar a producción. Tiene tipos ImapFlow no resueltos — ver gotcha siguiente.
- **ImapFlow tipos — `false | T`:** `client.search()`, `client.fetchOne()`, `client.download()` y `client.mailbox` devuelven `false | T`. El optional chaining `?.` no hace narrowing desde `false`. Usar siempre narrowing explícito: `const result = await client.search(...); const seqNums = result === false ? [] : result;` y `if (!message || !message.envelope) continue;`. TypeScript falla en build (Vercel) aunque `next dev` pase sin errores.
- **Git en Windows (MCP PowerShell):** Los comandos git cuelgan si se ejecutan directamente. Usar siempre `Start-Job` con `-Timeout` y `Receive-Job`. Para index corrupto: `Remove-Item .git\index -Force` + `Remove-Item .git\index.lock -Force` desde PowerShell.
- **Vercel "Redeploy" reutiliza el commit antiguo:** El botón Redeploy en el dashboard de Vercel redeploya el mismo commit, no el último de main. Para deployar código nuevo: hacer push o `git commit --allow-empty -m "chore: trigger deploy" && git push`.
- **Vercel runtime filesystem:** Read-only en producción. Nunca intentar `fs.writeFile` en `process.cwd()` desde una serverless function. Datos dinámicos → Supabase.
- **Gemini API en España/EU:** Restringido con 0 créditos en free tier (quota literal = 0). Fix: `export const preferredRegion = ["iad1"]` en la route que hace la llamada (fuerza ejecución en US East). Requiere billing activo en Google Cloud.
- **Supabase Respondedor project_id:** `skprvlhzbnwlhsslvqfg` (eu-west-2). Nueva tabla: `knowledge_qa` (project_id, question, answer, category, created_at).
- **Archive de hilo completo:** BFS via `message_id`/`in_reply_to` desde root para encontrar todos los mensajes. Ver `src/app/api/emails/archive/route.ts → collectThreadIds()`.
- **context-loader.ts:** Fusiona fichero estático `contexts/*.md` + últimas 50 entradas de `knowledge_qa` en Supabase. Siempre pasar `projectId` al llamar `loadProjectContext()`.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean

- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to 'tasks/todo.md' with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to 'tasks/todo.md'
6. **Capture Lessons**: Update 'tasks/lessons.md' after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- Nunca darme excesivas explicaciones, irme indicando que se va haciendo pero siendo lo más escueto posible para gastar los menos tokens posibles dentro de lo razonable.
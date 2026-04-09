# Respondedor — Instrucciones de Deploy

## 1. Push a GitHub

```bash
cd respondedor
git init
git add -A
git commit -m "feat: Respondedor — AI Email Manager backoffice"
git remote add origin https://github.com/icommunitylab/respondedor.git
git push -u origin main
```

## 2. Conectar con Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa el repo `icommunitylab/respondedor`
3. Framework: **Next.js** (autodetectado)
4. Root Directory: `.` (por defecto)
5. **NO hagas deploy aún** — primero configura las variables de entorno

## 3. Variables de Entorno en Vercel

En **Settings → Environment Variables**, añade todas estas:

### Supabase
| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://skprvlhzbnwlhsslvqfg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcHJ2bGh6Ym53bGhzc2x2cWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjk5MTgsImV4cCI6MjA5MTMwNTkxOH0.Ab3HzvfbP2V7VY4cQ7ZQ-7kROe1nyQd8d0D4ijorAQw` |
| `SUPABASE_SERVICE_ROLE_KEY` | *Copiar de Supabase Dashboard → Settings → API → service_role key* |

### Anthropic (Claude API)
| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | Tu API key de Anthropic |

### IMAP (Incoming Email)
| Variable | Valor |
|---|---|
| `IMAP_HOST` | `mail.musicdibs.com` |
| `IMAP_PORT` | `993` |
| `IMAP_USER` | `info@musicdibs.com` |
| `IMAP_PASSWORD` | Tu contraseña IMAP |
| `IMAP_TLS` | `true` |

### SMTP (Outgoing Email)
| Variable | Valor |
|---|---|
| `SMTP_HOST` | `mail.musicdibs.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `info@musicdibs.com` |
| `SMTP_PASSWORD` | Tu contraseña SMTP |
| `SMTP_SECURE` | `true` |
| `SMTP_FROM_NAME` | `Equipo MusicDibs` |

### Vercel Cron Security
| Variable | Valor |
|---|---|
| `CRON_SECRET` | Genera un valor seguro: `openssl rand -hex 32` |

## 4. Deploy

Una vez configuradas las variables, haz deploy desde el dashboard de Vercel o pushea a main.

## 5. Configuración del Cron Job

El archivo `vercel.json` ya está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-emails",
      "schedule": "0 * * * *"
    }
  ]
}
```

Esto ejecuta el check de emails **cada hora en punto**.

**Importante:** Los cron jobs de Vercel requieren plan **Pro** o superior. En el plan Hobby, los cron jobs se ejecutan una vez al día como mínimo.

Para verificar que el cron está activo: **Vercel Dashboard → tu proyecto → Settings → Cron Jobs**.

## 6. Supabase Realtime

Para que las suscripciones en tiempo real funcionen, habilita Realtime en las tablas:

1. Ve a **Supabase Dashboard → Database → Replication**
2. Activa **Realtime** para las tablas:
   - `emails`
   - `drafts`

## 7. Credenciales de acceso

- **URL del backoffice:** La URL que Vercel te asigne (ej: `respondedor.vercel.app`)
- **Login:** `development@respondedor.app` / tu contraseña configurada

## 8. Obtener la Service Role Key de Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto **Respondedor**
3. Ve a **Settings → API**
4. Copia la **service_role key** (la que dice "This key has the ability to bypass Row Level Security")
5. Pégala en Vercel como `SUPABASE_SERVICE_ROLE_KEY`

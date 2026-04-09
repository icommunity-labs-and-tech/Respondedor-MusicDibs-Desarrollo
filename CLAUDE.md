# CLAUDE.md — Plugin WordPress: Justificante de Compra

## Proyecto
Plugin de WordPress para generación de justificantes de compra. Desarrollado por el equipo "Nexus", un equipo de 5 agentes IA especializados liderado por Alex (Lead Software Architect).

## Stack tecnológico
- **Backend**: PHP (WordPress Plugin API, REST API, base de datos WP)
- **Frontend**: HTML, CSS, JavaScript, React (si aplica)
- **Animaciones**: GSAP / GreenSock (skills instaladas en `.claude/skills/gsap-*`)
- **Seguridad**: Sanitización de inputs, nonces, validación de datos, ABAC

## Estructura de archivos
- `CLAUDE.md` — Este archivo de configuración
- `.claude/skills/gsap-*` — Skills de GSAP (core, plugins, ScrollTrigger, timeline, React, performance)
- `.claude/plugins/feature-dev/` — Plugin de desarrollo de features (agents + commands)
- `tasks/todo.md` — Tareas en curso (crear si no existe)
- `tasks/lessons.md` — Lecciones aprendidas (crear si no existe)

## Equipo de agentes
El equipo "Nexus" (Alex, Marco, Elena, Sasha, Iker) está definido en las instrucciones de Cowork. En Code, cada agente interviene con su tag: `[ALEX]`, `[MARCO]`, `[ELENA]`, `[SASHA]`, `[IKER]`.

## Convenciones WordPress
- Prefijo de funciones: usar namespace o prefijo único del plugin
- Hooks: usar `add_action` / `add_filter` con prioridades explícitas
- Seguridad: `wp_nonce`, `sanitize_*`, `esc_*` en todo input/output
- Internacionalización: usar `__()` y `_e()` para strings traducibles
- Enqueue de assets: `wp_enqueue_script` / `wp_enqueue_style` (nunca inline directo)

## Reglas de trabajo en Code
1. **Modo plan** para tareas de 3+ pasos o decisiones arquitectónicas
2. **Código modular**: archivos separados por responsabilidad
3. **Debate interno**: los agentes cuestionan las soluciones entre sí para optimizar
4. **Verificación obligatoria**: nunca marcar tarea como completa sin demostrar que funciona
5. **GSAP**: consultar las skills instaladas antes de implementar animaciones
6. **Idioma**: código y comentarios en inglés, explicaciones al usuario en español
7. Tras correcciones del usuario, actualizar `tasks/lessons.md`

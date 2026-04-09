# Design System Specification: The Architectural Intelligence (AI) Framework

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Atrium"**

This design system is built upon the concept of an "Atrium"—a space characterized by light, openness, and structural clarity. In a backoffice environment for AI email management, the user is often overwhelmed by volume. Our goal is to provide a sense of "Computational Calm."

Unlike standard SaaS templates that rely on heavy borders and rigid grids, this system uses **Tonal Architecture**. We break the "template" look through intentional asymmetry, where the sidebar acts as a heavy anchor (The Monolith) against a light, expansive content area (The Canvas). We prioritize "Negative Space as a Feature," ensuring that every pixel serves a purpose, but not every pixel is filled.

---

## 2. Colors & Surface Philosophy
The palette moves beyond flat colors into a system of "Physicality and Light."

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For instance, a `surface-container-low` section sitting on a `surface` background provides enough contrast to define a zone without creating visual "noise."

### Surface Hierarchy & Nesting
Treat the UI as a series of nested layers.
- **Base Layer:** `surface` (#f7f9fb) – The foundation.
- **Sectioning:** `surface-container-low` (#f2f4f6) – For large layout divisions.
- **Interactive Cards:** `surface-container-lowest` (#ffffff) – To make content "pop" forward.
- **Active Overlays:** `surface-bright` (#f7f9fb) – For high-priority focus.

### The "Glass & Gradient" Rule
To evoke a premium, Vercel-inspired feel, use **Glassmorphism** for floating elements (modals, dropdowns). Use a 20px `backdrop-blur` with a semi-transparent `surface-container-lowest`.
- **Signature Texture:** Primary buttons should not be flat. Use a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle to provide "optical weight."

---

## 3. Typography: The Editorial Scale
We use a dual-font strategy to balance authority with utility.

*   **Display & Headlines:** **Manrope.** Its geometric yet warm curves provide a high-end editorial feel.
*   **Body & UI Labels:** **Inter.** Chosen for its exceptional legibility at small sizes and high "information density" environments.

**Hierarchy Strategy:**
- **Display-LG (3.5rem):** Reserved for empty states or major dashboard milestones.
- **Title-SM (1rem):** The workhorse for email subject lines.
- **Label-MD (0.75rem):** Used for metadata (Timestamps, Project Tags) to keep the UI clean.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "dirty." In this system, we use light to create hierarchy.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` card on a `surface-container-low` background. This creates a soft, natural "lift."
*   **Ambient Shadows:** For floating elements like the "Project Selector," use a shadow with a 32px blur, 0px offset, and 4% opacity of `on_surface` (#191c1e). It should feel like a soft glow rather than a drop shadow.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` (#c3c6d7) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Sidebar Navigation (The Monolith)
- **Background:** `on_secondary_fixed` (#131b2e).
- **Active State:** Use a "Pill" shape with `surface_variant` at 10% opacity. No borders.
- **Project Selector:** A high-contrast element at the top. Use a `0.5rem` (lg) roundedness for project logos to create a distinct visual language from the sharper UI elements.

### Professional Badges (The Indicators)
- **New:** Background `primary_fixed`, Text `on_primary_fixed_variant`.
- **Draft Ready:** Background `tertiary_fixed`, Text `on_tertiary_fixed_variant`.
- **Sent:** Background `secondary_fixed`, Text `on_secondary_fixed_variant`.
- *Note:* Badges use `full` (9999px) roundedness and `label-sm` typography.

### Input Fields & Textareas
- **Surface:** `surface_container_lowest`.
- **Interaction:** On focus, transition the `outline` from 15% opacity to 100% `primary` color with a 4px soft outer glow (using the `primary` color at 10% opacity).
- **Textareas:** Use a "frameless" approach where the container blends into the background until hovered or focused.

### Buttons
- **Primary:** Gradient (`primary` to `primary_container`), `0.375rem` (md) radius, white text.
- **Secondary:** Transparent background, `outline` at 20% opacity.
- **Tertiary (Ghost):** No background or border. Text color is `on_surface_variant`. Use for "Cancel" or "Archive" actions.

### Lists & Email Threads
**The Divider-Free Rule:** Forbid 1px dividers between emails. Instead, use a `1.5rem` vertical spacing gap. Use a subtle background shift (`surface-container-high`) on hover to define the row.

---

## 6. Do's and Don'ts

### Do
- **Do** use `8px` (lg) and `12px` (xl) corner radii for main containers to soften the "industrial" feel of a backoffice tool.
- **Do** leverage `surface-container-highest` for "Read" emails and `surface-container-lowest` for "Unread" emails to create instant visual weight.
- **Do** use "Optical Centering"—sometimes an icon looks better 1px higher than the mathematical center.

### Don't
- **Don't** use pure black (#000000). Use `on_surface` (#191c1e) for text to maintain a premium, ink-like feel.
- **Don't** use high-contrast borders to separate the sidebar from the main content. Let the color block of the Dark Navy sidebar define the edge.
- **Don't** crowd the interface. If a screen feels busy, increase the padding by one step in the spacing scale rather than adding more lines or boxes.

---

## 7. Spacing Scale
Maintain a strict 4pt grid system:
- **sm:** 4px
- **md:** 8px
- **lg:** 16px
- **xl:** 24px
- **2xl:** 40px (Default padding for main "Canvas" containers)
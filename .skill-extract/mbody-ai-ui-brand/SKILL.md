---
name: mbody-ai-ui-brand
description: >
  Apply MBody AI brand guidelines to any UI output — React components, HTML pages, dashboards, 
  data visualizations, presentations, or any visual interface. Use this skill whenever you are 
  building, styling, or redesigning any UI for MBody AI. Triggers include: "make it on-brand", 
  "use our brand", "MBody AI style", "brand guidelines", "light mode", "dark mode", "light/dark toggle",
  building any component, page, or dashboard for MBody AI, or any time the user wants UI that looks 
  like MBody AI. If you're creating visual output for MBody AI and haven't used this skill yet, use it now.
---

# MBody AI UI Brand Guidelines

MBody AI is a pioneer in embodied AI, building autonomous systems that learn and adapt in real time. The visual identity reflects this mission: **modern simplicity paired with technical authority**. Every design decision should communicate intelligence, precision, and forward motion — never clutter, gimmicks, or decoration for its own sake.

---

## Design Philosophy

The aesthetic is built on three core values:

- **Innovation** — bold, forward-looking forms that feel cutting-edge without being trendy
- **Intelligence** — clean, structured layouts that communicate clarity and competence  
- **Clarity** — purposeful minimalism that lets the content breathe; nothing superfluous

Visuals should use clean, bold forms with subtle palettes and precise accent highlights. The goal is always to show the power of intelligence made tangible — efficiency, autonomy, and scale — without overwhelming the viewer.

---

## Light Mode vs. Dark Mode

MBody AI supports **both dark and light modes**. Dark is the default and flagship look — it signals technical authority. Light mode is clean and professional, suited for daytime use, client-facing documents, or contexts where a lighter aesthetic is preferred.

**When to use which:**
- Default to **dark mode** unless the user specifies light, or the context clearly calls for it (e.g., a printed report, a public-facing marketing page, a client portal)
- Use **light mode** when the user says "light mode", "light theme", "bright", or "white background"
- Support **both** when the user says "light/dark toggle", "theme switcher", or "support both modes"

The brand accent colors (violet, blue, lavender, iris gradient) are identical in both modes — the mode only changes backgrounds, text, borders, and surface layers. This consistency keeps the brand recognizable regardless of which mode is active.

---

## Color System

### Brand Accent Colors (Mode-Invariant)
These never change between light and dark mode:
```css
/* Gradients */
--gradient-iris:   linear-gradient(135deg, #A52AE1, #3999FE);
--gradient-blue:   linear-gradient(135deg, #0081FF, #000000);
--gradient-violet: linear-gradient(135deg, #A52AE1, #000000);

/* Accents */
--electric-blue:   #0081FF;
--bright-violet:   #A52AE1;
--soft-lavender:   #928CE3;

/* Semantic */
--success:  #22C55E;
--warning:  #F59E0B;
--error:    #EF4444;
--teal:     #14B8A6;
```

### Dark Mode Tokens (Default)
```css
[data-theme="dark"], :root {
  --bg-primary:    #0A0A0E;   /* Page background */
  --bg-surface:    #111118;   /* Cards, panels */
  --bg-elevated:   #1A1A24;   /* Modals, dropdowns, tooltips */

  --text-primary:  #FFFFFF;   /* Headings, emphasis */
  --text-body:     #C6C6C6;   /* Body copy, descriptions */
  --text-muted:    rgba(198, 198, 198, 0.5); /* Timestamps, placeholders */

  --border-subtle: 1px solid rgba(146, 140, 227, 0.15);
  --border-active: 1px solid rgba(146, 140, 227, 0.35);

  --gradient-text: linear-gradient(90deg, #FFFFFF, #BF93F7);

  /* Atmospheric background glows */
  --atmo-1: rgba(165, 42, 225, 0.15);
  --atmo-2: rgba(0, 129, 255, 0.12);
}
```

### Light Mode Tokens
Light mode inverts the backgrounds and text while keeping the violet/blue accent language intact. The surfaces get a faint lavender undertone to stay clearly "MBody AI" rather than plain white.
```css
[data-theme="light"] {
  --bg-primary:    #F5F4FC;   /* Page background — lavender-tinted white */
  --bg-surface:    #FFFFFF;   /* Cards, panels */
  --bg-elevated:   #EEEDF8;   /* Modals, dropdowns — lifted lavender tint */

  --text-primary:  #0A0A0E;   /* Headings, emphasis */
  --text-body:     #4A4858;   /* Body copy — dark warm gray */
  --text-muted:    rgba(74, 72, 88, 0.5); /* Timestamps, placeholders */

  --border-subtle: 1px solid rgba(146, 140, 227, 0.2);
  --border-active: 1px solid rgba(146, 140, 227, 0.45);

  --gradient-text: linear-gradient(90deg, #0A0A0E, #A52AE1);

  /* Atmospheric background glows — lighter, more airy */
  --atmo-1: rgba(165, 42, 225, 0.06);
  --atmo-2: rgba(0, 129, 255, 0.05);
}
```

### Atmospheric Background (Both Modes)
Use the `--atmo-*` variables so the radial glows automatically adapt:
```css
body {
  background: var(--bg-primary);
  background-image:
    radial-gradient(ellipse at 0% 100%, var(--atmo-1) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 0%, var(--atmo-2) 0%, transparent 50%);
}
```

### Color Usage Principles
- Brand accents (violet, blue, lavender, iris gradient) are **identical in both modes** — this is what makes the brand recognizable
- In dark mode: color appears as precise accent against black; atmosphere comes from the dark canvas
- In light mode: color appears as grounding accents against white; use borders and surface layering to create depth
- The iris gradient (`#A52AE1 → #3999FE`) is always the primary CTA treatment — it's bold enough to read on both backgrounds
- Soft Lavender (`#928CE3`) works as a secondary accent on both backgrounds without adjustment

---

## Mode Toggle Implementation

### CSS Class Approach (Recommended)
Apply `data-theme` to `<html>` or `<body>` and switch it with JS:

```html
<html data-theme="dark">
```

```javascript
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('mbody-theme', next);
}

// On load — respect saved preference or system default
const saved = localStorage.getItem('mbody-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
```

### React Hook
```jsx
import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mbody-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mbody-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}
```

### Toggle Button
Use a minimal icon button in the top bar. The Sun/Moon icons communicate the current mode clearly:
```jsx
function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: 'var(--bg-elevated)',
        border: 'var(--border-subtle)',
        borderRadius: '8px',
        padding: '8px',
        cursor: 'pointer',
        color: 'var(--soft-lavender)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.2s',
      }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

---

## Typography

**Font: Inter** (open-source, neo-grotesque). Import from Google Fonts or bundle locally.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
```

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale
```css
/* Headings — Inter Regular (400) */
h1 { font-size: 3rem;     font-weight: 400; line-height: 1.15; color: var(--text-primary); }
h2 { font-size: 2rem;     font-weight: 400; line-height: 1.2;  color: var(--text-primary); }
h3 { font-size: 1.375rem; font-weight: 400; line-height: 1.3;  color: var(--text-primary); }

/* Accents / Labels — Inter Semi Bold (600) */
.label  { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); letter-spacing: 0.05em; text-transform: uppercase; }
.accent { font-size: 1rem;     font-weight: 600; color: var(--soft-lavender); }

/* Body / Main Text — Inter Regular (400) */
p, body  { font-size: 1rem;      font-weight: 400; line-height: 1.6; color: var(--text-body); }
.caption { font-size: 0.8125rem; font-weight: 400; color: var(--text-body); }
```

### Gradient Text (Mode-Aware)
```css
.gradient-text {
  background: var(--gradient-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```
Dark mode: white → lavender. Light mode: near-black → violet. Both communicate the same brand energy in their context.

### Typography Principles
- Headings use `var(--text-primary)` — white in dark, near-black in light. Regular weight, size creates hierarchy
- Semi Bold is reserved for accent labels, navigation, and UI chrome
- Body text uses `var(--text-body)` — always secondary to headings
- Apply gradient text to a single key phrase per section, never for body copy

---

## Component Patterns

### Buttons
Primary CTA uses the iris gradient — it reads boldly on both backgrounds without adjustment:
```css
.btn-primary {
  background: linear-gradient(135deg, #A52AE1, #3999FE);
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.9375rem;
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.btn-primary:hover { opacity: 0.88; }
```

Secondary button adapts via CSS variables:
```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.9375rem;
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  border: 1px solid rgba(146, 140, 227, 0.4);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.btn-secondary:hover {
  border-color: #928CE3;
  background: rgba(146, 140, 227, 0.08);
}
```

### Cards / Panels
```css
.card {
  background: var(--bg-surface);
  border: var(--border-subtle);
  border-radius: 12px;
  padding: 1.5rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.card:hover {
  border: var(--border-active);
  box-shadow: 0 0 24px rgba(165, 42, 225, 0.1);
}
```

### Input Fields
```css
.input {
  background: var(--bg-elevated);
  border: 1px solid rgba(146, 140, 227, 0.2);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  padding: 0.75rem 1rem;
  outline: none;
  transition: border-color 0.2s ease;
}
.input:focus {
  border-color: #928CE3;
  box-shadow: 0 0 0 3px rgba(146, 140, 227, 0.15);
}
.input::placeholder { color: var(--text-muted); }
```

### Navigation / Header
- Background: `var(--bg-surface)` with `var(--border-subtle)` bottom border
- Logo: brain icon + "MBody AI" in `var(--text-primary)` Inter Regular
- Nav links: `var(--text-body)`, transition to `var(--text-primary)` on hover
- Active link: `var(--text-primary)` or Soft Lavender
- CTA button: iris gradient (unchanged across modes)
- Include the ThemeToggle button in the header right area

### Status / Icon Badges
- **Active / Selected**: filled violet circle (`#A52AE1`) with white checkmark
- **Default**: outlined circle with subtle violet tint
- **Success**: `#22C55E` — reads on both backgrounds
- **Error / Destructive**: `#EF4444` — reads on both backgrounds

---

## Gradients & Visual Atmosphere

The iris gradient (`#A52AE1 → #3999FE`) is always the primary brand gradient — use it for CTAs, logo areas, and hero moments. It works on both dark and light backgrounds.

For background atmosphere, use the `--atmo-*` variables (defined per theme) so glows are appropriately dramatic in dark mode and airy in light mode:

```css
body {
  background: var(--bg-primary);
  background-image:
    radial-gradient(ellipse at 0% 100%, var(--atmo-1) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 0%, var(--atmo-2) 0%, transparent 50%);
}
```

For hero sections:
```css
/* Dark mode: deeper immersion */
[data-theme="dark"] .hero-section {
  background: linear-gradient(135deg, rgba(165, 42, 225, 0.2), rgba(57, 153, 254, 0.1));
  border-bottom: var(--border-subtle);
}

/* Light mode: soft wash */
[data-theme="light"] .hero-section {
  background: linear-gradient(135deg, rgba(165, 42, 225, 0.06), rgba(57, 153, 254, 0.04));
  border-bottom: var(--border-subtle);
}
```

---

## Icons

Icons should be:
- **Geometric and simple** — balanced proportions, consistent visual weight
- **Violet-blue gradient fill** (`#A52AE1 → #3999FE`) for brand icons
- **Flat solid style** — no strokes, no drop shadows
- **Consistent sizing** — stick to a single size grid (e.g., 20px, 24px, 32px — don't mix)

```css
.icon-card {
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

Icons in body content can use Soft Lavender (`#928CE3`) as a flat color — it's visible and on-brand on both backgrounds.

---

## Layout & Spacing

- **Max content width**: 1200–1280px, centered
- **Section padding**: `5rem 0` vertical, `2rem` horizontal minimum
- **Component spacing**: use a 4px base grid (4, 8, 12, 16, 24, 32, 48, 64, 80px)
- **Column grids**: 12-column for page layout; 3–4 column for feature grids
- **Breathing room is intentional** — generous whitespace signals confidence and precision (applies equally in both modes)

---

## Do's and Don'ts

**Do:**
- Default to dark mode; use light mode when the context calls for it
- Use `var(--bg-primary)`, `var(--text-primary)`, `var(--border-subtle)` etc. so components adapt automatically
- Use the iris gradient for the one most important CTA per screen — it works on both backgrounds
- Apply gradient text selectively for a single key phrase per section
- Keep components minimal — one visual highlight per card or section
- Include a theme toggle button in the header for any UI that supports both modes

**Don't:**
- Hard-code `#FFFFFF` or `#0A0A0E` for backgrounds/text — use CSS variables so mode switching works
- Apply gradients to every element — they lose impact when overused
- Mix Electric Blue and Bright Violet at full saturation in the same component
- Use bold/heavy type weights for headings — Regular weight with large size is the MBody AI style
- Add decorative flourishes to every element — precision means restraint
- Use fonts other than Inter

---

## Complete Quick-Start CSS Variables

Include this block in any stylesheet for the full token set with both modes:

```css
/* ── Mode-invariant brand tokens ── */
:root {
  --electric-blue:  #0081FF;
  --bright-violet:  #A52AE1;
  --soft-lavender:  #928CE3;
  --gradient-iris:    linear-gradient(135deg, #A52AE1, #3999FE);
  --gradient-blue:    linear-gradient(135deg, #0081FF, #000000);
  --gradient-violet:  linear-gradient(135deg, #A52AE1, #000000);
  --font-family:    'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-sm:  6px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --success: #22C55E;
  --warning: #F59E0B;
  --error:   #EF4444;
}

/* ── Dark mode (default) ── */
[data-theme="dark"], :root {
  --bg-primary:    #0A0A0E;
  --bg-surface:    #111118;
  --bg-elevated:   #1A1A24;
  --text-primary:  #FFFFFF;
  --text-body:     #C6C6C6;
  --text-muted:    rgba(198, 198, 198, 0.5);
  --border-subtle: 1px solid rgba(146, 140, 227, 0.15);
  --border-active: 1px solid rgba(146, 140, 227, 0.35);
  --gradient-text: linear-gradient(90deg, #FFFFFF, #BF93F7);
  --atmo-1: rgba(165, 42, 225, 0.15);
  --atmo-2: rgba(0, 129, 255, 0.12);
}

/* ── Light mode ── */
[data-theme="light"] {
  --bg-primary:    #F5F4FC;
  --bg-surface:    #FFFFFF;
  --bg-elevated:   #EEEDF8;
  --text-primary:  #0A0A0E;
  --text-body:     #4A4858;
  --text-muted:    rgba(74, 72, 88, 0.5);
  --border-subtle: 1px solid rgba(146, 140, 227, 0.2);
  --border-active: 1px solid rgba(146, 140, 227, 0.45);
  --gradient-text: linear-gradient(90deg, #0A0A0E, #A52AE1);
  --atmo-1: rgba(165, 42, 225, 0.06);
  --atmo-2: rgba(0, 129, 255, 0.05);
}

/* ── Respect system preference when no data-theme is set ── */
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    --bg-primary:    #F5F4FC;
    --bg-surface:    #FFFFFF;
    --bg-elevated:   #EEEDF8;
    --text-primary:  #0A0A0E;
    --text-body:     #4A4858;
    --text-muted:    rgba(74, 72, 88, 0.5);
    --border-subtle: 1px solid rgba(146, 140, 227, 0.2);
    --border-active: 1px solid rgba(146, 140, 227, 0.45);
    --gradient-text: linear-gradient(90deg, #0A0A0E, #A52AE1);
    --atmo-1: rgba(165, 42, 225, 0.06);
    --atmo-2: rgba(0, 129, 255, 0.05);
  }
}
```

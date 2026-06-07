# Premium Nature & Sustainable Tech — Visual Overhaul

A pure presentation refresh. No business logic, data flow, routing, or backend changes. All edits stay in stylesheets, layout wrappers, and visual component markup.

## 1. Global Design System (`src/styles.css`)

Rebuild the token layer around organic forest tones while keeping the existing OKLCH structure (so shadcn components keep working).

- **Palette retune**
  - `--background` (light): warm ivory-mint (`oklch(0.985 0.012 150)`)
  - `--background` (dark): deep forest gradient base (`oklch(0.18 0.03 158)`) layered with a body `background-image` of two radial glows (emerald + soft moss) over a linear forest gradient
  - `--primary`: vibrant emerald (kept, tightened chroma)
  - New tokens: `--moss` (soft moss panel), `--ivory` (contrast text), `--forest-deep`, `--forest-mid`, `--mint-glow`
  - New gradient tokens: `--gradient-forest`, `--gradient-title` (white → radiant mint), `--gradient-panel-moss`
- **Glassmorphism upgrade**
  - Rework `.glass` / `.glass-strong` to use `backdrop-filter: blur(12px) saturate(140%)` with an ultra-thin glowing border (`1px solid color-mix(in oklab, var(--mint-glow) 30%, transparent)`) and a soft inner highlight via `box-shadow: inset 0 1px 0 ...`
  - Add `.glass-pane` variant for floating dialog/card surfaces
- **Typography**
  - Load Plus Jakarta Sans + Cabinet Grotesk via `<link>` tags in `src/routes/__root.tsx` head (per Tailwind v4 gotcha — no CSS `@import` of URLs)
  - Update `--font-display` to Cabinet Grotesk, `--font-sans` to Plus Jakarta Sans
  - Add utility classes: `.title-gradient` (white → mint gradient text), `.hero-number` (ultra-bold, tracking `-0.03em`, tabular-nums), `.eyebrow` (uppercase micro-label)
  - Tighten global heading `letter-spacing: -0.02em`, set body `line-height: 1.65`
- **Motion**
  - Add `@keyframes fade-cinematic` (opacity + slight scale + blur out) for dialogs
  - Add `@keyframes mint-trace` for animated scanner lines

## 2. Layout Wrappers

- `src/routes/__root.tsx`: add font `<link rel="preconnect">` + stylesheet tags for Plus Jakarta Sans and Cabinet Grotesk.
- `src/routes/_authenticated.tsx`: wrap `<main>` with a forest-gradient backdrop + subtle noise texture overlay; keep header/footer/floating assistant untouched structurally.
- `src/components/AppHeader.tsx` & `SiteFooter.tsx`: swap surfaces to `.glass-pane` with mint-glow border; apply `.title-gradient` to brand wordmark.

## 3. Screen-Specific Visual Treatments

### Live Camera Scanner (`src/routes/_authenticated/live.tsx`)
- Replace existing HUD crosshair corners with organic-style targeting marks (rounded leaf-tipped corners using SVG) tinted emerald.
- Add animated glowing mint trace lines (two crossing beams using `mint-trace` keyframes) over the camera viewport.
- Update HUD scanline overlay color stops to emerald/mint instead of cyan.

### Disposal Map (`src/components/NearbyDisposal.tsx`)
- Restyle the centre ledger cards as luxury glass panes (`.glass-pane`, rounded-3xl, mint-glow border, soft drop-shadow).
- For each centre, render a row of **accepted-materials badges** (one chip per waste class the centre handles), pulled from existing `RR_CENTRES` data (`acceptedClasses` / equivalent field already in `src/lib/rrnagar-centres.ts` — verified at build time, no schema change). Badges use emerald/moss/amber/coral tints with a small icon + label.
- Promote the header to `.title-gradient` with an eyebrow label "Bengaluru Network".
- Distance / walk / status mini-stats: switch to `.hero-number` for the numeric values.

### Dialogs (`src/components/DisposalProofDialog.tsx` and any other Radix Dialog usages)
- Add a shared dialog content class (in `styles.css`) applying:
  - `animation: fade-cinematic 0.45s cubic-bezier(0.16, 1, 0.3, 1)`
  - Polished layered drop-shadow (`0 30px 80px -20px rgba(0,0,0,0.45), 0 0 0 1px var(--mint-glow)`)
  - Glass-pane background, generous padding, minimalist form spacing
- Apply class to DialogContent in proof dialog (and the floating assistant panel if it uses Dialog primitives).

### Dashboard (`src/routes/_authenticated/dashboard.tsx`)
- Apply `.hero-number` + `.title-gradient` to Eco-Points balance, streak, and total mass widgets.
- Convert widget cards to `.glass-pane`.

## 4. Out of Scope (explicit)

- No changes to: server functions, Supabase migrations, edge functions, auth flow, scan/classification logic, routing structure, or the floating assistant's behavior.
- No new dependencies.
- No data model or props changes for `NearbyDisposal` — badges are derived purely from existing `RR_CENTRES` fields.

## Technical Notes

- Tailwind v4: all tokens stay in `@theme` blocks inside `src/styles.css`; fonts loaded via `<link>`, never via CSS `@import` of a URL.
- All colors expressed as design tokens — no raw hex/`text-white` in components per design system rules.
- Verify after edit: route components still compile, dialogs animate, glassmorphism renders in both light/dark modes.

```text
styles.css ──► tokens + glass + title-gradient + fade-cinematic
   │
   ├─► __root.tsx        (font links)
   ├─► _authenticated    (forest backdrop)
   ├─► AppHeader/Footer  (glass-pane + gradient wordmark)
   ├─► live.tsx          (organic crosshairs + mint trace)
   ├─► NearbyDisposal    (luxury cards + material badges)
   ├─► DisposalProof…    (cinematic dialog)
   └─► dashboard.tsx     (hero-number widgets)
```

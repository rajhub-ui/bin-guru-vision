## EcoLens AI — Phase 1: Smart City Core

Honest constraints first:
- This stack is **TanStack Start (web) + Lovable Cloud**. We can't ship native mobile (RN/Flutter), Python/FastAPI, MongoDB, ESP32 firmware, or train YOLOv8 here — those need separate repos/hardware.
- Existing AI detection (Lovable AI Gateway / Gemini vision) **stays as-is** and we extend around it. No model swap.
- Maps: VITE_ secrets must live in `.env` (the secret tool rejected `VITE_GOOGLE_MAPS_API_KEY`). To unblock immediately I'll use **Leaflet + OpenStreetMap + Nominatim** (free, no key, looks great with custom tiles). We can swap to Google Maps later by replacing one component if you provide the key directly.

## What I'll build now

### 1. Visual overhaul — "Eco Daylight" smart-city theme
- New tokens in `src/styles.css`: warm cream bg `#f5f0e8`, sage `#dce5d4`, civic teal `#2d8a9e`, deep forest `#1b4332`, gradients + soft shadows.
- Display font pair: Sora (headings) + Inter (body).
- Glassmorphism cards, animated stat counters, subtle grid background.
- Refreshed `AppHeader`, `SiteFooter`, landing `index.tsx`, dashboard cards.

### 2. Disposal navigation (`/disposal`)
- Leaflet map centered on user geolocation.
- Nominatim search for nearby `recycling`, `waste_basket`, `waste_disposal`, `recycling_centre` POIs.
- Filter chips by waste type (plastic / e-waste / hazardous / glass / metal / organic / cloth).
- Selected facility → distance, ETA, "Open in Google Maps" deep link, route polyline via OSRM.
- "Find nearest disposal" CTA appears on every detection result card.

### 3. Hazardous waste alert system
- Extend the edge-function classifier to flag `ewaste`, plus new pseudo-classes inferred from labels: `battery`, `medical`, `chemical`, `sharps` (regex on returned label text — no model change).
- New `HazardAlert` component: red glass banner, audio beep (Web Audio API, no asset), PPE icons, step-by-step disposal, "Find hazardous center" → `/disposal?type=hazardous`.
- Logged to `detections` with a `hazard_level` flag (migration adds nullable column).

### 4. Admin analytics dashboard (`/admin`)
- Gated by `user_roles.role = 'admin'` (table already exists).
- Recharts: detections per day (area), waste-class breakdown (pie), CO₂e saved (bar), top hazard counts.
- Heatmap-lite: detections grouped by hour-of-day (recharts heatmap grid).
- "Promote me to admin" dev button (only visible if no admin exists yet) — inserts row via server function for first-run convenience.

### 5. New nav structure
```
/                       landing (smart-city hero)
/auth                   (existing)
/_authenticated/
  dashboard             (existing, restyled)
  scan, live, video, pdf, chat  (existing, restyled cards)
  disposal              NEW — map + facilities
  admin                 NEW — analytics, role-gated
```

## Deferred to Phase 2 (roadmap, not built now)
QR household tracking · IoT smart-bin dashboard · voice assistant · offline PWA · predictive pickup routing · multi-language · React Native mobile · real ESP32/MQTT · model retraining.

## Tech notes
- Add `leaflet`, `react-leaflet`, `recharts` (already present? will check), `@types/leaflet`.
- New server function `src/lib/admin.functions.ts` for role check + analytics aggregation (RLS-safe).
- Migration: `ALTER TABLE detections ADD COLUMN hazard_level text NULL;`
- All new pages get `head()` SEO metadata.
- No business-logic change to existing scan/classify pipeline beyond hazard label flagging.

Approve and I'll execute.
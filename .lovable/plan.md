## Goal
Enhance the live detector with material/decomposition info, restrict the disposal map to **5 hardcoded centres near RNSIT (RR Nagar, Bangalore)**, auto-open the map when waste is detected, and add a "proof of dumping" photo upload that grants eco-points.

## 1. Live detector — richer waste info
File: `src/routes/_authenticated/live.tsx` (+ extend `src/lib/disposal.ts`)
- For every detected item, render a "Material & decomposition" card alongside the existing label/bin info:
  - Material composition (e.g. plastic → PET / HDPE polymer, metal → aluminium / steel alloy, glass → silica + soda + lime, organic → cellulose / biomass…)
  - Decomposition method + estimated time (already partly in `DECOMPOSITION` — extend with a `materials` field).
- Add a `MATERIALS` map in `disposal.ts` keyed by `WasteClass`.

## 2. Hardcoded RNSIT/RR Nagar centres (5 places)
New file: `src/lib/rrnagar-centres.ts`
- Exactly **5** entries: `{ id, name, lat, lon, type, address, accepts: WasteClass[] }` within ~5 km of RNSIT College (12.9166°N, 77.4974°E):
  1. BBMP Dry Waste Collection Centre — RR Nagar
  2. E-Parisaraa E-Waste Collection Point — Kengeri
  3. Saahas Zero Waste Hub — Channasandra
  4. Local Scrap Dealer / Metal Recycler — BEML Layout
  5. Compost & Organic Waste Hub — Ullal Main Road
- Each centre lists which waste classes it accepts so the map can filter by detection class.

Update `src/routes/_authenticated/disposal.tsx`:
- Remove Nominatim live search.
- Show only these 5 centres, filterable by waste class.
- Map auto-centres on RNSIT; user location marker shown if permission granted.
- Accept `?class=<wasteClass>` search param → auto-filter centres that accept that class.

## 3. Auto-show map on detection
File: `src/routes/_authenticated/live.tsx`
- When a detection occurs, render an inline "Nearest disposal centres" panel below the detection card (reuses `DisposalMap` + the hardcoded list, filtered by detected class).
- Each centre row gets a "Navigate" button (Google Maps directions) and an "I dumped here" button → opens the proof-upload dialog (step 4).

## 4. Proof-of-dumping photo upload → eco-points
DB migration:
- New table `disposal_proofs` (id, user_id, detection_id nullable, centre_id text, centre_name text, image_path, eco_points_awarded int, created_at)
- RLS: users CRUD their own rows only.
- Storage bucket `disposal-proofs` (private); policies allow users to upload/read their own `{userId}/...` folder.

Flow (in `live.tsx`, reused on `scan.tsx`):
- "I dumped it — upload proof" button opens a dialog with file/camera input.
- Upload image to `disposal-proofs/{userId}/{uuid}.jpg`.
- Insert `disposal_proofs` row with `eco_points_awarded = 25` (flat; +10 bonus for e-waste/hazardous).
- Increment `profiles.eco_score` by the same amount.
- Toast: "🎉 +25 eco-points awarded".

## Technical details
- The 5 centres are static client data — no Nominatim, no rate limits, instant load.
- `DisposalMap` already accepts a `MapPlace[]`; no change to that component needed.
- Eco-point award reuses the existing `profiles.eco_score` column.
- Image upload uses the existing supabase storage client; a new bucket separate from `scans`.

## Out of scope
- Verifying the photo actually shows the waste at the centre (trust-based for now).
- Per-centre opening hours / phone numbers (left as `null`).

# EcoLens AI — Build Plan

A waste-classification PWA built entirely on this Lovable stack (TanStack Start + React on Cloudflare Workers, Lovable Cloud for DB/auth/storage, Lovable AI Gateway for the chatbot). All vision runs **in the browser** so image / live camera / video / PDF detection works offline.

## Scope vs. original spec

| Requested | Delivered as | Why |
|---|---|---|
| FastAPI backend | Lovable Cloud (Postgres + Edge Functions) + TanStack server functions | No Python runtime in Workers |
| TensorFlow/Keras + YOLO training | Pre-trained MobileNet (TF.js) for classification + YOLOv8n ONNX (onnxruntime-web) for detection, shipped as static assets | Runs offline in the browser; no GPU server needed |
| Speech-to-text / TTS | Browser `SpeechRecognition` + `speechSynthesis` Web APIs | Free, offline-capable, zero deps |
| PDF parsing + OCR | `pdfjs-dist` (extract images) + `tesseract.js` (OCR, optional) | Pure JS, runs in browser |
| Chatbot LLM | Lovable AI Gateway (Gemini 3 Flash) via edge function, streaming | Online-only, as you confirmed |
| Offline mode | Vite PWA plugin + service worker caches app shell + model weights | True offline for vision |
| Carbon tracking + gamification | Postgres tables + RLS + computed views | |

## Pages / routes

```
/                       Landing + value prop + CTA
/scan                   Image upload → classify (drag-drop, webp/png/jpg)
/live                   Live webcam YOLO detection (bounding boxes overlay)
/video                  Upload video → frame-sampled detection + timeline
/pdf                    PDF upload → image extraction → batch classify
/chat                   Voice + text chatbot (mic, TTS, streaming)
/dashboard              History, eco score, badges, carbon saved
/auth                   Login / signup (email)
```

## Data model (Lovable Cloud / Postgres)

- `profiles` (id, display_name, eco_score, created_at)
- `user_roles` (user_id, role) — separate table per security guidelines
- `detections` (id, user_id, source: image|live|video|pdf, predicted_class, confidence, image_url, carbon_grams, created_at)
- `chat_messages` (id, user_id, role, content, created_at)
- `badges` (id, slug, name, description, icon)
- `user_badges` (user_id, badge_id, earned_at)
- Storage bucket `scans` (private, RLS by user_id) for uploaded images/thumbs
- RLS: users see only their own rows; `has_role()` security-definer function

## AI / inference layout

- `public/models/mobilenet-waste/` — classification weights (TF.js graph model, 6 classes: plastic / paper / metal / glass / organic / e-waste). Loaded once, cached by SW.
- `public/models/yolov8n-waste.onnx` — detection weights for `/live` and `/video` via `onnxruntime-web` (WASM backend, threaded).
- `src/lib/vision/classifier.ts` — `classifyImage(file|imageData) → {label, confidence}`
- `src/lib/vision/detector.ts` — `detectFrame(videoEl) → boxes[]`, throttled to ~10 FPS
- `src/lib/disposal.ts` — static rules table mapping class → disposal instructions + carbon estimate

> Note on weights: I'll wire the pipeline against placeholder/public pretrained weights (e.g. a generic MobileNet fine-tuned on TrashNet that I can fetch). Production accuracy will require you to train on your own dataset and drop the resulting `.json`/`.onnx` into `public/models/`.

## Chatbot

- Edge function `chat` calls Lovable AI Gateway (`google/gemini-3-flash-preview`), streaming SSE.
- System prompt scoped to waste/recycling/sustainability, with current detection context injected when available.
- Frontend: Web Speech API for mic input → text → stream → `speechSynthesis` for voice reply.
- Offline fallback: small rule-based responder over the disposal-rules table.

## PWA / offline

- `vite-plugin-pwa` with Workbox: precache app shell + `/models/**`.
- `/scan`, `/live`, `/video`, `/pdf` fully functional offline. `/chat` shows offline banner + falls back to rule-based answers.

## Build order

1. Enable Lovable Cloud, create schema + RLS + storage bucket.
2. Design system pass in `styles.css` (eco palette, typography) + landing page.
3. Auth (email) + protected `_authenticated` layout for dashboard/history.
4. Image classifier pipeline + `/scan` page + disposal recommendations + write detection rows.
5. Live webcam detector (`/live`) with bounding-box canvas overlay + FPS counter.
6. Video upload (`/video`) — sample N frames, aggregate, timeline chart.
7. PDF route (`/pdf`) — pdfjs image extraction → reuse classifier.
8. Chatbot edge function + `/chat` UI with mic + TTS + streaming.
9. Dashboard: history, carbon saved, eco score, badges (gamification triggers in DB function).
10. PWA install + offline caching of models.
11. QA pass on each route, responsive check, empty/error states.

## Notes / caveats

- Model accuracy depends on the weights you ship; the architecture is correct but the included weights will be a generic baseline.
- Real-time YOLO in WASM gets ~5–15 FPS on a typical laptop; mobile will be lower. Acceptable for waste sorting.
- Microphone, camera, and notifications require HTTPS — preview & published URLs both qualify.
- Will be built incrementally; I'd suggest we ship steps 1–4 first, then iterate.

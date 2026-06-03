import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, Camera as CameraIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { classifyFile, logDetection, type DetectedItem } from "@/lib/scan";
import { DISPOSAL, DECOMPOSITION, MATERIALS } from "@/lib/disposal";
import { detectHazard, type HazardInfo } from "@/lib/hazard";
import { HazardAlert } from "@/components/HazardAlert";
import { EcoAssistant } from "@/components/EcoAssistant";
import { NearbyDisposal } from "@/components/NearbyDisposal";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scan — EcoLens AI" }] }),
  component: ScanPage,
});

const CLASS_COLORS: Record<string, string> = {
  plastic: "#38bdf8", paper: "#f59e0b", metal: "#94a3b8", glass: "#34d399",
  organic: "#84cc16", ewaste: "#f43f5e", cloth: "#a78bfa",
  battery: "#ef4444", hazardous: "#dc2626", wood: "#a16207",
  rubber: "#475569", medical: "#ec4899",
};

function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [detectionIds, setDetectionIds] = useState<(string | null)[]>([]);
  const [summary, setSummary] = useState("");
  const [hazard, setHazard] = useState<HazardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusQuery, setFocusQuery] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const onFile = async (file: File) => {
    setItems(null);
    setSummary("");
    setHazard(null);
    setDetectionIds([]);
    setPreviewUrl(URL.createObjectURL(file));
    setLoading(true);
    try {
      const res = await classifyFile(file);
      if (res.error || res.fallback) {
        setItems([]);
        return;
      }
      setItems(res.items);
      setSummary(res.summary);
      const h = detectHazard(res.items);
      setHazard(h);
      const ids = await Promise.all(
        res.items.map((it) =>
          logDetection({
            source: "image",
            predicted_class: it.class,
            confidence: it.confidence,
            carbon_grams: DISPOSAL[it.class].carbonGramsSaved,
            hazard_level: h?.level,
          }),
        ),
      );
      setDetectionIds(ids);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setItems(null);
    setSummary("");
    setHazard(null);
    setPreviewUrl(null);
    setDetectionIds([]);
    setActiveIdx(0);
  };

  // Draw AR overlay over the uploaded image, sized to the rendered image.
  const draw = () => {
    const o = overlayRef.current;
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!o || !wrap || !img || !items) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    o.width = w; o.height = h;
    const ctx = o.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    items.forEach((it, idx) => {
      if (!it.box) return;
      const [x, y, bw, bh] = it.box;
      const px = x * w, py = y * h, pw = bw * w, ph = bh * h;
      const color = CLASS_COLORS[it.class] ?? "#22c55e";
      const focused = idx === activeIdx;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = focused ? 24 : 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = focused ? 4 : 3;
      ctx.strokeRect(px, py, pw, ph);
      const c = Math.min(20, pw / 4, ph / 4);
      ctx.lineWidth = 5;
      [
        [px, py, 1, 1], [px + pw, py, -1, 1],
        [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1],
      ].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx as number, (cy as number) + (sy as number) * c);
        ctx.lineTo(cx as number, cy as number);
        ctx.lineTo((cx as number) + (sx as number) * c, cy as number);
        ctx.stroke();
      });
      ctx.restore();
      const label = `${DISPOSAL[it.class].emoji} ${it.label} · ${Math.round(it.confidence * 100)}%`;
      ctx.font = "600 13px system-ui, sans-serif";
      const tw = ctx.measureText(label).width + 14;
      const ly = py > 26 ? py - 8 : py + ph + 22;
      ctx.fillStyle = color;
      ctx.beginPath();
      (ctx as any).roundRect(px, ly - 18, tw, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(label, px + 7, ly - 3);
    });
  };

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeIdx, previewUrl]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!items || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.box) continue;
      const [bx, by, bw, bh] = it.box;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
        setActiveIdx(i);
        setFocusQuery(
          `Tell me specifically about the ${it.label} (${it.class}) in this image — which bin, hazards, how to recycle it.`,
        );
        return;
      }
    }
  };

  const activeItem = items && items.length > 0 ? items[Math.min(activeIdx, items.length - 1)] : null;
  const activeDetectionId = detectionIds[Math.min(activeIdx, detectionIds.length - 1)] ?? null;

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Image scan</h1>
          <p className="text-muted-foreground mt-2">
            Upload a photo — EcoLens identifies waste, overlays AR boxes, and tells you how to dispose of it. Click any box to ask the assistant about that item.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => inputRef.current?.click()}
          style={{ background: "var(--gradient-primary)" }}
          className="text-primary-foreground eco-shadow hover:opacity-90 font-semibold text-base px-6"
        >
          <Upload className="h-5 w-5 mr-2" /> Start Scanning
        </Button>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <div
          onClick={() => !previewUrl && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className="glass rounded-2xl p-4 min-h-[320px] grid place-items-center hover:eco-shadow transition-all border-2 border-dashed"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {previewUrl ? (
            <div
              ref={wrapRef}
              className="relative w-full rounded-xl overflow-hidden soft-shadow bg-black"
            >
              <img
                ref={imgRef}
                src={previewUrl}
                alt="upload preview"
                className="w-full h-auto block"
                onLoad={draw}
              />
              <canvas
                ref={overlayRef}
                onClick={handleOverlayClick}
                className="absolute inset-0 w-full h-full cursor-pointer"
              />
              {items && items.length > 0 && (
                <div className="absolute bottom-2 left-2 bg-background/90 rounded-full px-3 py-1 text-xs font-semibold shadow">
                  Tap a box to ask the assistant
                </div>
              )}
            </div>
          ) : (
            <div className="text-center cursor-pointer">
              <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-[var(--gradient-primary)] text-primary-foreground mb-4 eco-shadow">
                <Upload className="h-7 w-7" />
              </div>
              <p className="font-display text-lg font-semibold">Drop an image or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">JPG, PNG or WebP up to 10MB</p>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 min-h-[320px]">
          {loading && (
            <div className="h-full grid place-items-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-3">Analyzing with AI vision…</p>
              </div>
            </div>
          )}
          {!loading && !items && (
            <div className="h-full grid place-items-center text-center text-muted-foreground">
              <div>
                <CameraIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Results will appear here.</p>
              </div>
            </div>
          )}
          {!loading && items && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold">Detected</h2>
                <Button size="sm" variant="ghost" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
              </div>
              {summary && <p className="text-sm text-muted-foreground mb-4">{summary}</p>}
              {hazard && <div className="mb-4"><HazardAlert hazard={hazard} /></div>}
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No waste items detected.</p>
              ) : (
                <div className="space-y-4">
                  {items.map((it, i) => {
                    const d = DISPOSAL[it.class];
                    const mat = MATERIALS[it.class];
                    const dec = DECOMPOSITION[it.class];
                    const focused = i === activeIdx;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setActiveIdx(i);
                          setFocusQuery(
                            `Tell me specifically about the ${it.label} (${it.class}) in this image — which bin, hazards, how to recycle it.`,
                          );
                        }}
                        className={`w-full text-left rounded-xl border p-4 bg-card transition ${focused ? "ring-2 ring-primary" : "hover:bg-accent/30"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{d.emoji}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">{it.label}</div>
                              <div className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                                {d.label}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Progress value={Math.round(it.confidence * 100)} className="h-1.5" />
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {Math.round(it.confidence * 100)}%
                              </span>
                            </div>
                            <div className="mt-3 text-sm">
                              <div className="font-medium">{d.bin}</div>
                              <ul className="mt-1 list-disc list-inside text-muted-foreground space-y-0.5">
                                {d.instructions.map((step) => (
                                  <li key={step}>{step}</li>
                                ))}
                              </ul>
                              <div className="mt-3 rounded-lg p-3 border bg-accent/40 text-xs space-y-1">
                                <div><span className="font-semibold text-primary">Material:</span> <span className="text-muted-foreground">{mat.composition}</span></div>
                                <div><span className="font-semibold text-primary">Decomposes in:</span> <span className="text-muted-foreground">{dec.time}</span></div>
                                <div><span className="font-semibold text-primary">Recycling:</span> <span className="text-muted-foreground">{dec.method}</span></div>
                              </div>
                              <div className="mt-2 text-xs text-primary">
                                ≈ {d.carbonGramsSaved}g CO₂e saved if recycled correctly
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeItem && (
        <NearbyDisposal wasteClass={activeItem.class} detectionId={activeDetectionId} />
      )}

      <EcoAssistant
        focusQuery={focusQuery}
        context={
          items && items.length
            ? `Detected items: ${items.map((i) => `${i.label} (${i.class})`).join(", ")}.${hazard ? ` Hazard level: ${hazard.level}.` : ""}${activeItem ? ` User is currently focused on: ${activeItem.label} (${activeItem.class}).` : ""}`
            : undefined
        }
      />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Square, Camera as CameraIcon, Sparkles } from "lucide-react";
import { classifyCanvas, logDetection, type DetectedItem } from "@/lib/scan";
import { DISPOSAL, DECOMPOSITION, MATERIALS } from "@/lib/disposal";
import { EcoAssistant } from "@/components/EcoAssistant";
import { NearbyDisposal } from "@/components/NearbyDisposal";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({ meta: [{ title: "Live AR detection — EcoLens AI" }] }),
  component: LivePage,
});

// Distinct AR overlay color per class
const CLASS_COLORS: Record<string, string> = {
  plastic: "#38bdf8", paper: "#f59e0b", metal: "#94a3b8", glass: "#34d399",
  organic: "#84cc16", ewaste: "#f43f5e", cloth: "#a78bfa",
  battery: "#ef4444", hazardous: "#dc2626", wood: "#a16207",
  rubber: "#475569", medical: "#ec4899",
};

function LivePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [detectionIds, setDetectionIds] = useState<(string | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [focusQuery, setFocusQuery] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
    } catch {
      // silent
    }
  };

  const stop = () => {
    const v = videoRef.current;
    const stream = v?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setRunning(false);
    setItems([]);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    const o = overlayRef.current;
    if (o) o.getContext("2d")?.clearRect(0, 0, o.width, o.height);
  };

  // Draw AR boxes whenever items change
  useEffect(() => {
    const o = overlayRef.current;
    const wrap = wrapRef.current;
    if (!o || !wrap) return;
    const w = wrap.clientWidth,
      h = wrap.clientHeight;
    o.width = w;
    o.height = h;
    const ctx = o.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    items.forEach((it) => {
      if (!it.box) return;
      const [x, y, bw, bh] = it.box;
      const px = x * w,
        py = y * h,
        pw = bw * w,
        ph = bh * h;
      const color = CLASS_COLORS[it.class] ?? "#22c55e";
      // Glow box
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, pw, ph);
      // Corner brackets for AR feel
      const c = Math.min(20, pw / 4, ph / 4);
      ctx.lineWidth = 5;
      [
        [px, py, 1, 1],
        [px + pw, py, -1, 1],
        [px, py + ph, 1, -1],
        [px + pw, py + ph, -1, -1],
      ].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx as number, (cy as number) + (sy as number) * c);
        ctx.lineTo(cx as number, cy as number);
        ctx.lineTo((cx as number) + (sx as number) * c, cy as number);
        ctx.stroke();
      });
      ctx.restore();
      // Label pill
      const label = `${DISPOSAL[it.class].emoji} ${it.label} · ${Math.round(it.confidence * 100)}%`;
      ctx.font = "600 13px system-ui, sans-serif";
      const tw = ctx.measureText(label).width + 14;
      const ly = py > 26 ? py - 8 : py + ph + 22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px, ly - 18, tw, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(label, px + 7, ly - 3);
    });
  }, [items]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(async () => {
      const v = videoRef.current;
      const c = captureRef.current;
      if (!v || !c || busy || v.videoWidth === 0) return;
      setBusy(true);
      c.width = 640;
      c.height = (640 * v.videoHeight) / v.videoWidth;
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      try {
        const res = await classifyCanvas(c);
        if (res.error || res.fallback) return; // silent fallback on busy AI
        setItems(res.items);
        const ids = await Promise.all(
          res.items.map((it) =>
            logDetection({
              source: "live",
              predicted_class: it.class,
              confidence: it.confidence,
              carbon_grams: DISPOSAL[it.class].carbonGramsSaved,
            }),
          ),
        );
        setDetectionIds(ids);
      } finally {
        setBusy(false);
      }
    }, 2500);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, busy]);

  useEffect(() => () => stop(), []);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-2">
            Live AR detection <Sparkles className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground mt-2">
            Point your camera at one or more items — EcoLens overlays AR boxes around each one.
          </p>
        </div>
        {!running ? (
          <Button
            onClick={start}
            size="lg"
            style={{ background: "var(--gradient-primary)" }}
            className="text-primary-foreground eco-shadow hover:opacity-90 font-semibold text-base px-6"
          >
            <CameraIcon className="h-5 w-5 mr-2" /> Start Camera
          </Button>
        ) : (
          <Button onClick={stop} size="lg" variant="destructive" className="font-semibold">
            <Square className="h-4 w-4 mr-2" /> Stop
          </Button>
        )}
      </header>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 glass-strong rounded-3xl p-3 md:p-4 neon-shadow">
          <div ref={wrapRef} className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas
              ref={overlayRef}
              onClick={(e) => {
                if (!wrapRef.current) return;
                const rect = wrapRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                for (let i = 0; i < items.length; i++) {
                  const it = items[i];
                  if (!it.box) continue;
                  const [bx, by, bw, bh] = it.box;
                  if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
                    setActiveIdx(i);
                    setFocusQuery(`Tell me specifically about the ${it.label} (${it.class}) I just tapped on — bin, hazards, how to recycle it.`);
                    return;
                  }
                }
              }}
              className="absolute inset-0 w-full h-full cursor-pointer"
            />

            {/* HUD overlay layers — only when camera is live */}
            {running && (
              <>
                <div className="hud-scanlines" />
                {busy && <div className="hud-scanline-beam" />}
                {/* Corner crosshairs */}
                <CornerCrosshair className="top-3 left-3" />
                <CornerCrosshair className="top-3 right-3 rotate-90" />
                <CornerCrosshair className="bottom-3 left-3 -rotate-90" />
                <CornerCrosshair className="bottom-3 right-3 rotate-180" />
              </>
            )}

            {!running && (
              <div className="absolute inset-0 grid place-items-center text-white/70 text-sm bg-black/50">
                <div className="text-center">
                  <CameraIcon className="h-10 w-10 mx-auto mb-2 opacity-60" />
                  Camera off — press <span className="font-semibold">Start Camera</span>
                </div>
              </div>
            )}

            {/* HUD status chips */}
            {running && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-emerald-300/90 bg-black/45 border border-emerald-400/30 px-3 py-1 rounded-full backdrop-blur">
                <span className={`h-1.5 w-1.5 rounded-full ${busy ? "bg-emerald-300 animate-pulse" : "bg-emerald-400"}`} />
                {busy ? "Analyzing frame" : "AI HUD live"}
              </div>
            )}
            {running && items.length > 0 && (
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur border border-white/10 text-white rounded-full px-3 py-1 text-xs font-semibold">
                {items.length} item{items.length > 1 ? "s" : ""} detected
              </div>
            )}
          </div>
          <canvas ref={captureRef} className="hidden" />
        </div>


        <div className="lg:col-span-2 glass-strong rounded-3xl p-5 md:p-6 animate-sheet-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Material taxonomy</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Live HUD
            </span>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-dashed">
              <div className="text-3xl mb-2">🔭</div>
              <p className="text-sm text-muted-foreground">Hold one or more items in frame…</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {items.map((it, i) => {
                const d = DISPOSAL[it.class];
                const dec = DECOMPOSITION[it.class];
                const mat = MATERIALS[it.class];
                const color = CLASS_COLORS[it.class];
                const focused = i === activeIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setActiveIdx(i);
                      setFocusQuery(`Tell me specifically about the ${it.label} (${it.class}) — bin, hazards, how to recycle it.`);
                    }}
                    className={`w-full text-left rounded-2xl border p-3 bg-card/80 backdrop-blur transition animate-sheet-up ${focused ? "ring-2 ring-primary border-primary/40" : "hover:bg-accent/30"}`}
                    style={{ borderLeft: `4px solid ${color}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-xl">
                        {d.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{it.label}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {d.label} · {d.bin}
                        </div>
                      </div>
                      <div className="text-xs tabular-nums font-mono px-2 py-1 rounded-md bg-background border">
                        {Math.round(it.confidence * 100)}%
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border bg-background/60 p-3 text-xs space-y-1.5">
                      <div><span className="font-semibold text-primary">Material:</span> <span className="text-muted-foreground">{mat.composition}</span></div>
                      <div><span className="font-semibold text-primary">How it's made:</span> <span className="text-muted-foreground">{mat.manufacturing}</span></div>
                      <div><span className="font-semibold text-primary">Decomposes in:</span> <span className="text-muted-foreground">{dec.time}</span></div>
                      <div><span className="font-semibold text-primary">Recycling method:</span> <span className="text-muted-foreground">{dec.method}</span></div>
                      <div><span className="font-semibold text-primary">Becomes:</span> <span className="text-muted-foreground">{mat.recycledInto}</span></div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {items.length > 0 && (
        <NearbyDisposal
          wasteClass={items[Math.min(activeIdx, items.length - 1)].class}
          detectionId={detectionIds[Math.min(activeIdx, detectionIds.length - 1)] ?? null}
        />
      )}

      <EcoAssistant
        title="Live detection assistant"
        focusQuery={focusQuery}
        context={
          items.length
            ? `Currently in frame: ${items.map((i) => `${i.label} (${i.class})`).join(", ")}.${items[activeIdx] ? ` User focused on: ${items[activeIdx].label} (${items[activeIdx].class}).` : ""}`
            : undefined
        }
      />
    </div>
  );
}

function CornerCrosshair({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-6 w-6 ${className}`}
      style={{
        borderTop: "2px solid #00E676",
        borderLeft: "2px solid #00E676",
        boxShadow: "0 0 10px rgba(0,230,118,0.6)",
      }}
    />
  );
}


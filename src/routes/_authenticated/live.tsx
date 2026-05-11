import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { classifyCanvas, logDetection, type DetectedItem } from "@/lib/scan";
import { DISPOSAL } from "@/lib/disposal";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({ meta: [{ title: "Live detection — EcoLens AI" }] }),
  component: LivePage,
});

function LivePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
    } catch {
      toast.error("Could not access camera. Check permissions.");
    }
  };

  const stop = () => {
    const v = videoRef.current;
    const stream = v?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setRunning(false);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(async () => {
      const v = videoRef.current; const c = canvasRef.current;
      if (!v || !c || busy || v.videoWidth === 0) return;
      setBusy(true);
      c.width = 480; c.height = (480 * v.videoHeight) / v.videoWidth;
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      const res = await classifyCanvas(c);
      setBusy(false);
      if (res.error) return;
      setItems(res.items);
      for (const it of res.items) {
        logDetection({ source: "live", predicted_class: it.class, confidence: it.confidence, carbon_grams: DISPOSAL[it.class].carbonGramsSaved });
      }
    }, 2500);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, busy]);

  useEffect(() => () => stop(), []);

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">Live camera</h1>
        <p className="text-muted-foreground mt-2">Hold an item up to your camera. Frames are sent every 2.5s.</p>
      </header>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-4 soft-shadow">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!running && <div className="absolute inset-0 grid place-items-center text-white/70 text-sm">Camera off</div>}
            {busy && <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5"><Loader2 className="h-4 w-4 animate-spin" /></div>}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-3 flex gap-2">
            {!running ? (
              <Button onClick={start} className="bg-[var(--gradient-primary)] text-primary-foreground"><Play className="h-4 w-4 mr-1" /> Start</Button>
            ) : (
              <Button onClick={stop} variant="destructive"><Square className="h-4 w-4 mr-1" /> Stop</Button>
            )}
          </div>
        </div>
        <div className="glass rounded-2xl p-6 soft-shadow">
          <h2 className="font-display text-xl font-semibold mb-3">Detections</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Waiting for items…</p>
          ) : (
            <div className="space-y-3">
              {items.map((it, i) => {
                const d = DISPOSAL[it.class];
                return (
                  <div key={i} className="rounded-xl border p-3 flex items-center gap-3">
                    <div className="text-2xl">{d.emoji}</div>
                    <div className="flex-1">
                      <div className="font-medium">{it.label}</div>
                      <div className="text-xs text-muted-foreground">{d.bin}</div>
                    </div>
                    <div className="text-xs tabular-nums">{Math.round(it.confidence * 100)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

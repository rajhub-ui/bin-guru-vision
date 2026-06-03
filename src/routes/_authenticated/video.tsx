import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { classifyCanvas, logDetection, type DetectedItem } from "@/lib/scan";
import { DISPOSAL, type WasteClass } from "@/lib/disposal";
import { EcoAssistant } from "@/components/EcoAssistant";

export const Route = createFileRoute("/_authenticated/video")({
  head: () => ({ meta: [{ title: "Video — EcoLens AI" }] }),
  component: VideoPage,
});

function VideoPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const onFile = async (file: File) => {
    setItems([]);
    setCounts({});
    setProgress(0);
    setRunning(true);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise((r) => (video.onloadedmetadata = () => r(null)));
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = (480 * video.videoHeight) / video.videoWidth;
    const ctx = canvas.getContext("2d")!;
    const samples = Math.min(8, Math.max(3, Math.floor(video.duration / 2)));
    const localCounts: Record<string, number> = {};
    const allItems: DetectedItem[] = [];
    for (let i = 0; i < samples; i++) {
      const t = (video.duration * (i + 0.5)) / samples;
      video.currentTime = t;
      await new Promise((r) => (video.onseeked = () => r(null)));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const res = await classifyCanvas(canvas);
      if (res.error || res.fallback) continue;
      for (const it of res.items) {
        allItems.push(it);
        localCounts[it.class] = (localCounts[it.class] ?? 0) + 1;
        logDetection({
          source: "video",
          predicted_class: it.class,
          confidence: it.confidence,
          carbon_grams: DISPOSAL[it.class].carbonGramsSaved,
        });
      }
      setProgress(Math.round(((i + 1) / samples) * 100));
    }
    setItems(allItems);
    setCounts(localCounts);
    setRunning(false);
    URL.revokeObjectURL(url);
  };

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">Video analysis</h1>
        <p className="text-muted-foreground mt-2">
          Upload a clip — we'll sample frames and classify the waste shown.
        </p>
      </header>
      <div
        onClick={() => inputRef.current?.click()}
        className="glass rounded-2xl p-10 text-center cursor-pointer border-2 border-dashed hover:eco-shadow"
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-[var(--gradient-primary)] text-primary-foreground mb-4">
          <Upload className="h-7 w-7" />
        </div>
        <p className="font-display text-lg font-semibold">Drop a video or click to upload</p>
        <p className="text-sm text-muted-foreground">MP4, MOV or WebM</p>
      </div>

      {running && (
        <div className="mt-6 glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Sampling frames…
          </div>
          <Progress value={progress} />
        </div>
      )}

      {!running && items.length > 0 && (
        <div className="mt-6 glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold mb-3">Aggregate</h2>
          {top && (
            <p className="mb-4 text-sm">
              Most-detected category:{" "}
              <span className="font-semibold">{DISPOSAL[top[0] as WasteClass].label}</span> (
              {top[1]} times)
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(counts).map(([cls, n]) => {
              const d = DISPOSAL[cls as WasteClass];
              return (
                <div key={cls} className="rounded-xl border p-3 flex items-center gap-3">
                  <div className="text-2xl">{d.emoji}</div>
                  <div className="flex-1 font-medium">{d.label}</div>
                  <div className="text-sm tabular-nums">{n}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

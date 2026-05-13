import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Loader2, Camera as CameraIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { classifyFile, logDetection, type DetectedItem } from "@/lib/scan";
import { DISPOSAL, DECOMPOSITION } from "@/lib/disposal";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scan — EcoLens AI" }] }),
  component: ScanPage,
});

function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File) => {
    setItems(null);
    setSummary("");
    setPreviewUrl(URL.createObjectURL(file));
    setLoading(true);
    try {
      const res = await classifyFile(file);
      // Errors silenced — show empty results gracefully.
      if (res.error || res.fallback) {
        setItems([]);
        return;
      }
      setItems(res.items);
      setSummary(res.summary);
      for (const it of res.items) {
        const d = DISPOSAL[it.class];
        logDetection({
          source: "image",
          predicted_class: it.class,
          confidence: it.confidence,
          carbon_grams: d.carbonGramsSaved,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setItems(null);
    setSummary("");
    setPreviewUrl(null);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Image scan</h1>
          <p className="text-muted-foreground mt-2">
            Upload a photo and EcoLens will identify the waste and tell you how to dispose of it.
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
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className="glass rounded-2xl p-8 min-h-[320px] grid place-items-center cursor-pointer hover:eco-shadow transition-all border-2 border-dashed"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="upload preview"
              className="max-h-[420px] rounded-xl soft-shadow"
            />
          ) : (
            <div className="text-center">
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
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No waste items detected.</p>
              ) : (
                <div className="space-y-4">
                  {items.map((it, i) => {
                    const d = DISPOSAL[it.class];
                    return (
                      <div key={i} className="rounded-xl border p-4 bg-card">
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
                              <div className="mt-3 rounded-lg p-3 border bg-accent/40">
                                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                                  Decomposition
                                </div>
                                <div className="text-xs mt-1">
                                  <span className="font-medium">Time:</span>{" "}
                                  {DECOMPOSITION[it.class].time}
                                </div>
                                <div className="text-xs mt-1">
                                  <span className="font-medium">Method:</span>{" "}
                                  {DECOMPOSITION[it.class].method}
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-primary">
                                ≈ {d.carbonGramsSaved}g CO₂e saved if recycled correctly
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileText, Upload, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { classifyCanvas, logDetection, type DetectedItem } from "@/lib/scan";
import { DISPOSAL, DECOMPOSITION } from "@/lib/disposal";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/pdf")({
  head: () => ({ meta: [{ title: "PDF analysis — EcoLens AI" }] }),
  component: PdfPage,
});

interface PageResult {
  pageNumber: number;
  thumbnail: string;       // dataURL
  items: DetectedItem[];
  summary: string;
}

function PdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const onFile = async (file: File) => {
    setPages([]); setProgress(0); setBusy(true); setFileName(file.name);
    try {
      // Lazy-load pdfjs and configure worker (Vite-friendly)
      const pdfjs: any = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const total = Math.min(pdf.numPages, 20); // safety cap
      const out: PageResult[] = [];

      for (let p = 1; p <= total; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        const res = await classifyCanvas(canvas);
        const items = res.error || res.fallback ? [] : res.items;
        out.push({
          pageNumber: p,
          thumbnail: canvas.toDataURL("image/jpeg", 0.7),
          items,
          summary: res.summary || "",
        });
        setPages([...out]);
        setProgress(Math.round((p / total) * 100));

        for (const it of items) {
          logDetection({ source: "pdf", predicted_class: it.class, confidence: it.confidence, carbon_grams: DISPOSAL[it.class].carbonGramsSaved });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not read this PDF.");
    } finally {
      setBusy(false);
    }
  };

  const exportPdfReport = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    doc.setFillColor(34, 139, 87);
    doc.rect(0, 0, pageW, 60, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("EcoLens AI — PDF Disposal Report", margin, 36);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`${fileName} · ${new Date().toLocaleString()}`, margin, 52);
    y = 80;
    doc.setTextColor(20);

    pages.forEach((pg) => {
      if (y > pageH - 200) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text(`Page ${pg.pageNumber}`, margin, y); y += 14;
      if (pg.summary) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(90);
        const s = doc.splitTextToSize(pg.summary, pageW - margin * 2);
        doc.text(s, margin, y); y += s.length * 12 + 4;
        doc.setTextColor(20);
      }
      if (pg.items.length === 0) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(140);
        doc.text("No waste items detected on this page.", margin, y); y += 18;
        doc.setTextColor(20);
      } else {
        pg.items.forEach((it) => {
          const d = DISPOSAL[it.class]; const dec = DECOMPOSITION[it.class];
          if (y > pageH - 90) { doc.addPage(); y = margin; }
          doc.setFont("helvetica", "bold"); doc.setFontSize(11);
          doc.text(`• ${it.label} — ${d.label} (${Math.round(it.confidence * 100)}%)`, margin, y); y += 14;
          doc.setFont("helvetica", "normal"); doc.setFontSize(10);
          const bin = doc.splitTextToSize(`Disposal: ${d.bin}`, pageW - margin * 2 - 10);
          doc.text(bin, margin + 10, y); y += bin.length * 12;
          const decT = doc.splitTextToSize(`Decomposition (${dec.time}): ${dec.method}`, pageW - margin * 2 - 10);
          doc.text(decT, margin + 10, y); y += decT.length * 12 + 4;
        });
      }
      y += 8;
      doc.setDrawColor(225); doc.line(margin, y, pageW - margin, y); y += 14;
    });

    doc.save(`ecolens-pdf-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const total = pages.reduce((a, p) => a + p.items.length, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">PDF analysis</h1>
          <p className="text-muted-foreground mt-2">Upload a PDF — EcoLens scans every page and produces a disposal report.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="lg"
            onClick={() => inputRef.current?.click()}
            style={{ background: "var(--gradient-primary)" }}
            className="text-primary-foreground eco-shadow hover:opacity-90 font-semibold"
            disabled={busy}
          >
            <Upload className="h-5 w-5 mr-2" /> Upload PDF
          </Button>
          {pages.length > 0 && !busy && (
            <Button size="lg" variant="outline" onClick={exportPdfReport}>
              <Download className="h-4 w-4 mr-2" /> Export report
            </Button>
          )}
        </div>
      </header>

      <input
        ref={inputRef} type="file" accept="application/pdf" hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {!busy && pages.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          className="glass rounded-2xl p-12 text-center cursor-pointer hover:eco-shadow transition-all border-2 border-dashed"
        >
          <FileText className="h-12 w-12 mx-auto text-primary mb-3" />
          <p className="font-display text-lg font-semibold">Drop a PDF or click to upload</p>
          <p className="text-sm text-muted-foreground mt-1">Up to 20 pages will be analysed.</p>
        </div>
      )}

      {busy && (
        <div className="glass rounded-2xl p-6 soft-shadow mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium">Analysing pages… {progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {pages.length > 0 && (
        <>
          <div className="glass rounded-2xl p-5 soft-shadow mb-6 flex flex-wrap gap-6">
            <div><div className="text-2xl font-bold">{pages.length}</div><div className="text-xs text-muted-foreground">pages scanned</div></div>
            <div><div className="text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">items detected</div></div>
            <div className="flex-1 text-sm text-muted-foreground self-end truncate">{fileName}</div>
          </div>

          <div className="space-y-5">
            {pages.map((pg) => (
              <div key={pg.pageNumber} className="glass rounded-2xl p-5 soft-shadow grid md:grid-cols-[160px_1fr] gap-5">
                <div>
                  <img src={pg.thumbnail} alt={`Page ${pg.pageNumber}`} className="rounded-lg border w-full" />
                  <div className="text-xs text-center mt-2 text-muted-foreground">Page {pg.pageNumber}</div>
                </div>
                <div>
                  {pg.summary && <p className="text-sm text-muted-foreground italic mb-3">{pg.summary}</p>}
                  {pg.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No waste items detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {pg.items.map((it, i) => {
                        const d = DISPOSAL[it.class]; const dec = DECOMPOSITION[it.class];
                        return (
                          <div key={i} className="rounded-xl border p-3 bg-card">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{d.emoji}</div>
                              <div className="flex-1">
                                <div className="font-semibold">{it.label} <span className="text-xs font-normal text-muted-foreground">— {d.label}</span></div>
                                <div className="text-xs text-muted-foreground">{d.bin}</div>
                              </div>
                              <div className="text-xs tabular-nums">{Math.round(it.confidence * 100)}%</div>
                            </div>
                            <div className="mt-2 text-xs">
                              <div><span className="font-semibold text-primary">Decompose:</span> {dec.time}</div>
                              <div className="text-muted-foreground"><span className="font-medium text-foreground">Method:</span> {dec.method}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

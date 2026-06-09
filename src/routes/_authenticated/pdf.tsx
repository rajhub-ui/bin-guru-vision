import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileText, Upload, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { classifyCanvas, logDetection, type DetectedItem } from "@/lib/scan";
import { DISPOSAL, DECOMPOSITION } from "@/lib/disposal";
import { EcoAssistant } from "@/components/EcoAssistant";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/pdf")({
  head: () => ({ meta: [{ title: "PDF analysis — EcoLens AI" }] }),
  component: PdfPage,
});

interface PageResult {
  pageNumber: number;
  thumbnail: string; // dataURL
  thumbWidth: number;
  thumbHeight: number;
  items: DetectedItem[];
  itemCrops: string[]; // per-item cropped dataURL aligned to items[]
  summary: string;
}

interface PdfJsModule {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getViewport: (options: { scale: number }) => { width: number; height: number };
        render: (options: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
          canvas: HTMLCanvasElement;
        }) => { promise: Promise<void> };
      }>;
    }>;
  };
}

function PdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const onFile = async (file: File) => {
    setPages([]);
    setProgress(0);
    setBusy(true);
    setFileName(file.name);
    try {
      // Lazy-load pdfjs and configure worker (Vite-friendly)
      const pdfjs = (await import("pdfjs-dist")) as unknown as PdfJsModule;
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
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        const res = await classifyCanvas(canvas);
        const items = res.error || res.fallback ? [] : res.items;

        // Build per-item crops from normalized box coords (with small padding)
        const itemCrops: string[] = items.map((it) => {
          if (!it.box) return "";
          const [bx, by, bw, bh] = it.box;
          const pad = 0.04;
          const x = Math.max(0, (bx - pad) * canvas.width);
          const y = Math.max(0, (by - pad) * canvas.height);
          const w = Math.min(canvas.width - x, (bw + pad * 2) * canvas.width);
          const h = Math.min(canvas.height - y, (bh + pad * 2) * canvas.height);
          if (w < 10 || h < 10) return "";
          const c = document.createElement("canvas");
          c.width = Math.round(w);
          c.height = Math.round(h);
          c.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, c.width, c.height);
          return c.toDataURL("image/jpeg", 0.8);
        });

        out.push({
          pageNumber: p,
          thumbnail: canvas.toDataURL("image/jpeg", 0.7),
          thumbWidth: canvas.width,
          thumbHeight: canvas.height,
          items,
          itemCrops,
          summary: res.summary || "",
        });
        setPages([...out]);
        setProgress(Math.round((p / total) * 100));

        for (const it of items) {
          logDetection({
            source: "pdf",
            predicted_class: it.class,
            confidence: it.confidence,
            carbon_grams: DISPOSAL[it.class].carbonGramsSaved,
          });
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
    const margin = 44;
    const contentW = pageW - margin * 2;

    const drawHeaderBand = (title: string, subtitle: string) => {
      doc.setFillColor(34, 139, 87);
      doc.rect(0, 0, pageW, 72, "F");
      doc.setFillColor(46, 160, 105);
      doc.rect(0, 68, pageW, 4, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(title, margin, 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(subtitle, margin, 58);
    };

    const drawFooter = () => {
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setDrawColor(220);
        doc.line(margin, pageH - 28, pageW - margin, pageH - 28);
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text("EcoLens AI — Sustainable Waste Intelligence", margin, pageH - 14);
        doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 14, { align: "right" });
      }
    };

    drawHeaderBand(
      "EcoLens AI — PDF Disposal Report",
      `${fileName} · Generated ${new Date().toLocaleString()}`,
    );
    let y = 100;
    doc.setTextColor(20);

    // Cover summary
    const totalItems = pages.reduce((a, p) => a + p.items.length, 0);
    const counts: Record<string, number> = {};
    pages.forEach((p) =>
      p.items.forEach((it) => {
        counts[it.class] = (counts[it.class] ?? 0) + 1;
      }),
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Executive summary", margin, y);
    y += 8;
    doc.setDrawColor(34, 139, 87);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 80, y);
    doc.setLineWidth(0.5);
    y += 16;

    const stats: [string, string][] = [
      ["Pages scanned", String(pages.length)],
      ["Items detected", String(totalItems)],
      [
        "Top category",
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
          ? DISPOSAL[
              Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof DISPOSAL
            ].label
          : "—",
      ],
    ];
    const colW = contentW / stats.length;
    stats.forEach(([label, value], i) => {
      const x = margin + i * colW;
      doc.setFillColor(245, 250, 246);
      doc.roundedRect(x + 4, y, colW - 8, 56, 6, 6, "F");
      doc.setTextColor(34, 100, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(value, x + 16, y + 28);
      doc.setTextColor(110);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(label.toUpperCase(), x + 16, y + 46);
    });
    y += 76;
    doc.setTextColor(20);

    pages.forEach((pg) => {
      // Need at least ~180pt for a page section header + thumbnail
      if (y > pageH - 220) {
        doc.addPage();
        y = margin;
      }

      // Page section header
      doc.setFillColor(34, 139, 87);
      doc.roundedRect(margin, y, contentW, 26, 4, 4, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Page ${pg.pageNumber}`, margin + 12, y + 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `${pg.items.length} item${pg.items.length === 1 ? "" : "s"} detected`,
        pageW - margin - 12,
        y + 17,
        { align: "right" },
      );
      y += 36;
      doc.setTextColor(20);

      // Page thumbnail + summary side by side
      const thumbW = 150;
      const ratio = pg.thumbHeight / pg.thumbWidth;
      const thumbH = Math.min(200, thumbW * ratio);
      try {
        doc.addImage(pg.thumbnail, "JPEG", margin, y, thumbW, thumbH);
        doc.setDrawColor(220);
        doc.rect(margin, y, thumbW, thumbH);
      } catch {
        // ignore image errors
      }

      const textX = margin + thumbW + 16;
      const textW = contentW - thumbW - 16;
      let ty = y + 4;
      if (pg.summary) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(90);
        const lines = doc.splitTextToSize(pg.summary, textW);
        doc.text(lines, textX, ty + 8);
        ty += lines.length * 12 + 8;
      }
      doc.setTextColor(20);

      if (pg.items.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(140);
        doc.text("No waste items detected on this page.", textX, ty + 12);
        doc.setTextColor(20);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Detected materials:", textX, ty + 12);
        ty += 24;
        doc.setFont("helvetica", "normal");
        pg.items.slice(0, 6).forEach((it) => {
          const d = DISPOSAL[it.class];
          doc.setFontSize(10);
          doc.text(
            `• ${d.emoji} ${it.label} — ${d.label} (${Math.round(it.confidence * 100)}%)`,
            textX,
            ty,
          );
          ty += 13;
        });
      }

      y += Math.max(thumbH, ty - y) + 14;

      // Per-item detail cards (with cropped image)
      pg.items.forEach((it, idx) => {
        const d = DISPOSAL[it.class];
        const dec = DECOMPOSITION[it.class];
        const cardH = 110;
        if (y + cardH > pageH - 50) {
          doc.addPage();
          y = margin;
        }

        // Card background
        doc.setFillColor(250, 252, 250);
        doc.setDrawColor(220);
        doc.roundedRect(margin, y, contentW, cardH, 8, 8, "FD");

        // Left accent bar
        doc.setFillColor(34, 139, 87);
        doc.roundedRect(margin, y, 4, cardH, 2, 2, "F");

        // Crop image on the left of the card
        const imgBox = 90;
        const imgX = margin + 14;
        const imgY = y + 10;
        if (pg.itemCrops[idx]) {
          try {
            doc.addImage(pg.itemCrops[idx], "JPEG", imgX, imgY, imgBox, imgBox);
            doc.setDrawColor(210);
            doc.rect(imgX, imgY, imgBox, imgBox);
          } catch {
            // ignore
          }
        } else {
          doc.setFillColor(235, 240, 235);
          doc.roundedRect(imgX, imgY, imgBox, imgBox, 4, 4, "F");
          doc.setFontSize(28);
          doc.setTextColor(34, 139, 87);
          doc.text(d.emoji, imgX + imgBox / 2, imgY + imgBox / 2 + 8, { align: "center" });
        }

        // Text content
        const tx = imgX + imgBox + 14;
        const tw = contentW - (imgBox + 14 + 14 + 4);
        let cy = y + 22;

        doc.setTextColor(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`${d.emoji}  ${it.label}`, tx, cy);

        // Class badge
        doc.setFillColor(34, 139, 87);
        const badgeText = d.label.toUpperCase();
        doc.setFontSize(8);
        const badgeW = doc.getTextWidth(badgeText) + 12;
        doc.roundedRect(tx, cy + 6, badgeW, 14, 7, 7, "F");
        doc.setTextColor(255);
        doc.text(badgeText, tx + 6, cy + 16);

        doc.setTextColor(110);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(
          `Confidence: ${Math.round(it.confidence * 100)}%`,
          tx + badgeW + 10,
          cy + 16,
        );
        cy += 32;

        doc.setTextColor(40);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Disposal:", tx, cy);
        doc.setFont("helvetica", "normal");
        const binLines = doc.splitTextToSize(d.bin, tw - 50);
        doc.text(binLines, tx + 46, cy);
        cy += binLines.length * 11 + 2;

        doc.setFont("helvetica", "bold");
        doc.text("Decompose:", tx, cy);
        doc.setFont("helvetica", "normal");
        const decLines = doc.splitTextToSize(`${dec.time} — ${dec.method}`, tw - 60);
        doc.text(decLines, tx + 56, cy);

        // CO2 savings badge bottom right
        doc.setFillColor(232, 245, 234);
        doc.setTextColor(34, 100, 60);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const co2 = `CO₂e saved: ${d.carbonGramsSaved} g`;
        const co2W = doc.getTextWidth(co2) + 14;
        doc.roundedRect(margin + contentW - co2W - 12, y + cardH - 22, co2W, 14, 7, 7, "F");
        doc.text(co2, margin + contentW - co2W - 5, y + cardH - 12);
        doc.setTextColor(20);

        y += cardH + 10;
      });

      y += 6;
    });

    drawFooter();
    doc.save(`ecolens-pdf-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const total = pages.reduce((a, p) => a + p.items.length, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">PDF analysis</h1>
          <p className="text-muted-foreground mt-2">
            Upload a PDF — EcoLens scans every page and produces a disposal report.
          </p>
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
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {!busy && pages.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
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
            <div>
              <div className="text-2xl font-bold">{pages.length}</div>
              <div className="text-xs text-muted-foreground">pages scanned</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">items detected</div>
            </div>
            <div className="flex-1 text-sm text-muted-foreground self-end truncate">{fileName}</div>
          </div>

          <div className="space-y-5">
            {pages.map((pg) => (
              <div
                key={pg.pageNumber}
                className="glass rounded-2xl p-5 soft-shadow grid md:grid-cols-[160px_1fr] gap-5"
              >
                <div>
                  <img
                    src={pg.thumbnail}
                    alt={`Page ${pg.pageNumber}`}
                    className="rounded-lg border w-full"
                  />
                  <div className="text-xs text-center mt-2 text-muted-foreground">
                    Page {pg.pageNumber}
                  </div>
                </div>
                <div>
                  {pg.summary && (
                    <p className="text-sm text-muted-foreground italic mb-3">{pg.summary}</p>
                  )}
                  {pg.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No waste items detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {pg.items.map((it, i) => {
                        const d = DISPOSAL[it.class];
                        const dec = DECOMPOSITION[it.class];
                        return (
                          <div key={i} className="rounded-xl border p-3 bg-card">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{d.emoji}</div>
                              <div className="flex-1">
                                <div className="font-semibold">
                                  {it.label}{" "}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    — {d.label}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">{d.bin}</div>
                              </div>
                              <div className="text-xs tabular-nums">
                                {Math.round(it.confidence * 100)}%
                              </div>
                            </div>
                            <div className="mt-2 text-xs">
                              <div>
                                <span className="font-semibold text-primary">Decompose:</span>{" "}
                                {dec.time}
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-medium text-foreground">Method:</span>{" "}
                                {dec.method}
                              </div>
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

      <EcoAssistant
        title="PDF analysis assistant"
        context="The user analyzed a PDF document for waste items. Help them understand disposal and recycling for items found across pages."
      />
    </div>
  );
}

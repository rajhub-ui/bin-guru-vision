import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { DISPOSAL, DECOMPOSITION, type WasteClass } from "@/lib/disposal";

interface Detection {
  id: string;
  source: string;
  predicted_class: WasteClass;
  confidence: number;
  carbon_grams: number;
  created_at: string;
}

export async function exportDetectionsPDF(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: profile } = await supabase
    .from("profiles").select("display_name, eco_score").eq("id", user.id).maybeSingle();
  const { data: rows } = await supabase
    .from("detections").select("*")
    .order("created_at", { ascending: false }).limit(limit);
  const dets = (rows as Detection[]) ?? [];

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) { doc.addPage(); y = margin; }
  };

  // Header band
  doc.setFillColor(34, 139, 87);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text("EcoLens AI — Detection Report", margin, 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), margin, 56);
  y = 95;

  // Summary
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(`Hello ${profile?.display_name ?? "Eco warrior"}`, margin, y); y += 18;
  const totalCarbon = dets.reduce((s, d) => s + (d.carbon_grams ?? 0), 0);
  const counts = dets.reduce<Record<string, number>>((a, d) => { a[d.predicted_class] = (a[d.predicted_class] ?? 0) + 1; return a; }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  const summary = [
    `Eco score: ${profile?.eco_score ?? 0}`,
    `Total scans: ${dets.length}`,
    `CO2e saved: ${(totalCarbon / 1000).toFixed(2)} kg`,
    `Most sorted: ${top ? DISPOSAL[top[0] as WasteClass].label : "—"}`,
  ];
  summary.forEach((s) => { doc.text(s, margin, y); y += 15; });
  y += 8;

  doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 16;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Latest detections", margin, y); y += 18;

  if (dets.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(11);
    doc.text("No detections yet.", margin, y);
  }

  for (const d of dets) {
    const info = DISPOSAL[d.predicted_class];
    const dec = DECOMPOSITION[d.predicted_class];
    const block = 110;
    ensureSpace(block);

    // Card border
    doc.setDrawColor(220); doc.setFillColor(248, 250, 247);
    doc.roundedRect(margin, y, pageW - margin * 2, block - 12, 6, 6, "FD");

    doc.setTextColor(30); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(`${info.label}`, margin + 12, y + 18);

    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
      `${new Date(d.created_at).toLocaleString()}  ·  source: ${d.source}  ·  confidence ${Math.round(d.confidence * 100)}%`,
      margin + 12, y + 32,
    );

    doc.setTextColor(30); doc.setFontSize(10);
    const bin = doc.splitTextToSize(`Disposal: ${info.bin}`, pageW - margin * 2 - 24);
    doc.text(bin, margin + 12, y + 48);

    doc.setTextColor(34, 100, 60);
    doc.text(`CO2e saved: ${d.carbon_grams ?? info.carbonGramsSaved} g`, margin + 12, y + 64);

    doc.setTextColor(30);
    const decText = doc.splitTextToSize(`Decomposition (${dec.time}): ${dec.method}`, pageW - margin * 2 - 24);
    doc.text(decText, margin + 12, y + 80);

    y += block;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`EcoLens AI · Page ${i} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  doc.save(`ecolens-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

import { createFileRoute } from "@tanstack/react-router";
import { NearbyDisposal } from "@/components/NearbyDisposal";
import type { WasteClass } from "@/lib/disposal";
import { WASTE_CLASSES } from "@/lib/disposal";
import { useState } from "react";

interface DisposalSearch {
  class?: WasteClass;
}

export const Route = createFileRoute("/_authenticated/disposal")({
  validateSearch: (search: Record<string, unknown>): DisposalSearch => {
    const c = typeof search.class === "string" ? (search.class as WasteClass) : undefined;
    return { class: c && WASTE_CLASSES.includes(c) ? c : undefined };
  },
  head: () => ({
    meta: [
      { title: "Disposal map — EcoLens AI" },
      { name: "description", content: "Curated waste disposal centres across Bengaluru — covering Central, North, South, East, West, Whitefield & Electronic City." },
    ],
  }),
  component: DisposalPage,
});

function DisposalPage() {
  const search = Route.useSearch();
  const [filter, setFilter] = useState<WasteClass | null>(search.class ?? null);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Local Disposal Network
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Disposal map — <span className="eco-gradient-text">Bengaluru</span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Curated waste-disposal centres across the city. Filter by type to find a verified
          drop-off — covers Central, North, South, East, West, Whitefield, Electronic City &amp; more.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter(null)}
          className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition ${
            filter === null
              ? "text-white border-transparent neon-shadow"
              : "border-border hover:bg-accent"
          }`}
          style={filter === null ? { background: "var(--gradient-neon)" } : undefined}
        >
          All centres
        </button>
        {WASTE_CLASSES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition capitalize ${
              filter === c
                ? "text-white border-transparent neon-shadow"
                : "border-border hover:bg-accent"
            }`}
            style={filter === c ? { background: "var(--gradient-neon)" } : undefined}
          >
            {c}
          </button>
        ))}
      </div>

      <NearbyDisposal wasteClass={filter} />
    </div>
  );
}

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
      { name: "description", content: "5 hand-picked waste disposal centres near RNSIT College, RR Nagar, Bangalore." },
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
        <h1 className="text-4xl font-bold">Disposal map — RR Nagar</h1>
        <p className="text-muted-foreground mt-2">
          5 curated waste-disposal centres within ~5 km of RNSIT College. Filter by the type of waste
          you need to drop off.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter(null)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
            filter === null
              ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent"
              : "border-border hover:bg-accent"
          }`}
        >
          All centres
        </button>
        {WASTE_CLASSES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition capitalize ${
              filter === c
                ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent"
                : "border-border hover:bg-accent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <NearbyDisposal wasteClass={filter} />
    </div>
  );
}

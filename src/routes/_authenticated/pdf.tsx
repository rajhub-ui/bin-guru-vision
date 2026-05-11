import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pdf")({
  head: () => ({ meta: [{ title: "PDF — EcoLens AI" }] }),
  component: () => (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">PDF analysis</h1>
        <p className="text-muted-foreground mt-2">Coming next: extract page images from a PDF and classify the waste shown.</p>
      </header>
      <div className="glass rounded-2xl p-12 text-center soft-shadow">
        <FileText className="h-12 w-12 mx-auto text-primary mb-3" />
        <p className="text-muted-foreground">PDF pipeline shipping in the next iteration.</p>
      </div>
    </div>
  ),
});

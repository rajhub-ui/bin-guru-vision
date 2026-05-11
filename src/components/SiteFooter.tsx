import { Leaf } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t mt-20 py-10 text-sm text-muted-foreground">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Leaf className="h-4 w-4 text-primary" />
          <span>EcoLens AI · Sort smarter, waste less.</span>
        </div>
        <p className="text-xs">© {new Date().getFullYear()} EcoLens. All recyclables welcome.</p>
      </div>
    </footer>
  );
}

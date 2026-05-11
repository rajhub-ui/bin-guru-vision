import { Link, useRouter } from "@tanstack/react-router";
import { Leaf, Camera, Video, FileText, MessageCircle, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/live", label: "Live", icon: Video },
  { to: "/video", label: "Video", icon: Video },
  { to: "/pdf", label: "PDF", icon: FileText },
  { to: "/chat", label: "Assistant", icon: MessageCircle },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

export function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-primary)] text-primary-foreground eco-shadow">
              <Leaf className="h-5 w-5" />
            </span>
            <span>EcoLens<span className="eco-gradient-text"> AI</span></span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  activeProps={{ className: "px-3 py-2 rounded-lg text-sm font-medium text-foreground bg-accent" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:inline-flex">
                <LogOut className="h-4 w-4 mr-1" /> Sign out
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
                <Button asChild size="sm" className="bg-[var(--gradient-primary)] text-primary-foreground hover:opacity-90">
                  <Link to="/auth">Get started</Link>
                </Button>
              </>
            )}
            {user && (
              <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
        {user && open && (
          <div className="md:hidden border-t px-4 py-3 grid gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent"
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
            <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-left">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

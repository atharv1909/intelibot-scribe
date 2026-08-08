import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [paywallUnlocked, setPaywallUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Verify User Auth Session
    if (!loading && !session) {
      void navigate({ to: "/auth", search: { next: pathname } });
      return;
    }

    // 2. Verify x402 Paywall Settlement Token
    const paywallToken = localStorage.getItem("x402_paywall_token");
    if (!loading && session && !paywallToken) {
      setPaywallUnlocked(false);
      void navigate({ to: "/paywall", search: { next: pathname } });
    } else if (paywallToken) {
      setPaywallUnlocked(true);
    }
  }, [loading, session, navigate, pathname]);

  if (loading || !session || paywallUnlocked === false) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="rule-label">Verifying session & x402 paywall authorization…</p>
      </div>
    );
  }

  return (
    <div className="grain min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3">
          <Link to="/runs" className="font-[family-name:var(--font-display)] text-lg tracking-tight">
            Lattice
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/runs" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
              Runs
            </Link>
            <Link to="/memory" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">
              Strategic memory
            </Link>
            <Link to="/paywall" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground flex items-center gap-1.5 text-xs font-mono bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              x402 Unlocked ($0.005 USDC)
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{session.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                localStorage.removeItem("x402_paywall_token");
                await supabase.auth.signOut();
                void navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Lattice Research Pipeline" },
      {
        name: "description",
        content:
          "Sign in to Lattice to run governed, human-approved AI research pipelines from prompt to publishable paper.",
      },
      { property: "og:title", content: "Sign in — Lattice Research Pipeline" },
      {
        property: "og:description",
        content: "Access your governed AI research runs, approval gates and audit logs.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const target = next && next.startsWith("/") ? next : "/runs";

  useEffect(() => {
    if (!loading && session) void navigate({ to: target });
  }, [loading, session, navigate, target]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. You can start a run now.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${target}` },
      });
      if (error) {
        if (error.message?.includes("not enabled") || error.message?.includes("validation_failed")) {
          toast.error("Google sign-in is not enabled in Supabase yet. Please sign in with Email/Password below!");
        } else {
          toast.error(error.message || "Google sign-in failed");
        }
      }
    } catch {
      toast.error("Please sign in with Email & Password below!");
    }
  }

  return (
    <main className="grain flex min-h-screen items-center justify-center px-6 py-16">
      <div className="paper w-full max-w-md p-8">
        <p className="rule-label">Lattice</p>
        <h1 className="mt-3 text-3xl">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Governed research runs with human approval gates at every irreversible step.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lab.edu"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="rule-label">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={onGoogle}>
          Continue with Google
        </Button>

        <button
          type="button"
          className="mt-6 w-full text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
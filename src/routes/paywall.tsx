import { createFileRoute } from "@tanstack/react-router";
import { X402Paywall } from "@/components/paywall/X402Paywall";

export const Route = createFileRoute("/paywall")({
  component: PaywallPage,
});

function PaywallPage() {
  const next = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("next") || "/runs"
    : "/runs";

  return <X402Paywall next={next} />;
}

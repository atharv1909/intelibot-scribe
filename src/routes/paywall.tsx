import { createFileRoute } from "@tanstack/react-router";
import { X402Paywall } from "@/components/paywall/X402Paywall";

export const Route = createFileRoute("/paywall")({
  component: PaywallPage,
});

function PaywallPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const next = searchParams.get("next") || "/runs";

  return <X402Paywall next={next} />;
}

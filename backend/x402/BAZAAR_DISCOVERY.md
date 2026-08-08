# Adding GoPlausible Bazaar Discovery to an x402 Seller

This document explains, end to end, how we got this seller's paid endpoints listed on the
**GoPlausible Bazaar** — the public discovery catalog at
`https://facilitator.goplausible.xyz/discovery/resources`.

It is written from what we actually did in this repo, including the gotchas.

---

## 1. What "being listed" actually means

The GoPlausible facilitator keeps a discovery catalog (the "Bazaar"). Each entry describes a
paid resource: its URL, method, price, network, and an input/output schema so agents can
discover and call it.

Two facts drive everything:

1. **A route is cataloged only when a *real payment settles* through the facilitator.** Declaring
   metadata is necessary but not sufficient — nothing appears until at least one on-chain
   settlement carries that metadata to the facilitator.
2. **The catalog keys entries by the request `resourceUrl`.** So the URL that gets listed is
   whatever public URL the buyer actually hit. A payment settled against `localhost` lists
   `http://localhost:...`, which is useless. **You must settle against a public URL.**

The discovery metadata flows:

```
Resource Server (declares it)
   → 402 response  (PAYMENT-REQUIRED header, extensions.bazaar)
   → Payment Payload / Payment Requirements
   → Facilitator (validates schema, catalogs on settle)
   → Bazaar catalog (/discovery/resources, /discovery/merchants)
```

---

## 2. The package decision (important)

This project's **payment flow** uses the official x402-foundation packages
(`@x402/hono`, `@x402/core`, `@x402/avm`). For **Bazaar discovery only**, we use GoPlausible's
package, `@x402-avm/extensions`, so the discovery metadata matches the exact schema the
GoPlausible facilitator validates against.

| Concern | Package | Scope |
| --- | --- | --- |
| Payment middleware / 402 / settle | `@x402/hono`, `@x402/core`, `@x402/avm` | x402-foundation (official) |
| Bazaar discovery declaration + extension | `@x402-avm/extensions` | GoPlausible |
| (Optional) Bazaar query client for verification | `@x402-avm/core` | GoPlausible |

The two scopes are **wire-compatible**: both define `BAZAAR.key === "bazaar"`,
`declareDiscoveryExtension()` returns `{ bazaar: { info, schema } }`, and
`bazaarResourceServerExtension` is structurally a `@x402/core` `ResourceServerExtension`
(`{ key, enrichDeclaration }`). We register it across scopes with a type cast.

> Do **not** swap the payment packages to `@x402-avm/*`. Only discovery uses GoPlausible's package.

Install it in the seller workspace:

```bash
npm install @x402-avm/extensions --workspace=seller
```

---

## 3. Seller code — the three steps

All in `seller/src/index.ts`. (See GoPlausible's reference:
`https://github.com/GoPlausible/.github/blob/main/profile/algorand-x402-documentation/typescript/x402-avm-extensions-examples.md`)

### Step A — import the discovery helpers from GoPlausible

```typescript
import { declareDiscoveryExtension, bazaarResourceServerExtension } from '@x402-avm/extensions';
import type { ResourceServerExtension } from '@x402/core/types';
```

### Step B — register the Bazaar extension on the resource server

`bazaarResourceServerExtension` enriches each 402 response with the route's discovery metadata.

```typescript
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK_CAIP2, new ExactAvmScheme())
  // Cross-scope cast: the object comes from @x402-avm/* but is structurally
  // a @x402/core ResourceServerExtension ({ key, enrichDeclaration }).
  .registerExtension(bazaarResourceServerExtension as unknown as ResourceServerExtension);
```

### Step C — declare metadata per endpoint and attach it to the route

`declareDiscoveryExtension(...)` returns `{ bazaar: {...} }`, which drops straight into a
route's `extensions` field. `paymentMiddleware` (and the extension's `enrichDeclaration`) then
inject it into the 402 — and auto-fill `method` for GET, plus `bodyType`/`body` for POST.

```typescript
const weatherDiscovery = declareDiscoveryExtension({
  output: {
    example: {
      city: 'San Francisco', temperature: 64, condition: 'Partly Cloudy',
      humidity: 72, timestamp: '2026-06-15T16:00:00.000Z', paidVia: 'x402 / USDC Algorand Testnet',
    },
  },
});

// POST endpoint: declare the body shape too
const analyzeDiscovery = declareDiscoveryExtension({
  bodyType: 'json',
  input: { text: 'Sample text to analyze' },
  inputSchema: { properties: { text: { type: 'string' } }, required: ['text'] },
  output: { example: { /* ... */ } },
});

const routes = {
  'GET /weather': {
    accepts: { scheme: 'exact', network: NETWORK_CAIP2, payTo: SELLER_ADDRESS, price: WEATHER_PRICE },
    description: 'Current weather for a random city — pay-per-request via x402',
    mimeType: 'application/json',
    extensions: weatherDiscovery,   // <-- discovery metadata
  },
  'POST /analyze': {
    accepts: { scheme: 'exact', network: NETWORK_CAIP2, payTo: SELLER_ADDRESS, price: '$0.002' },
    description: 'Example POST endpoint',
    mimeType: 'application/json',
    extensions: analyzeDiscovery,
  },
  // ...
};
```

### Verify locally that the 402 now carries it

```bash
npm run seller   # terminal 1
# terminal 2:
curl -s -D - -o /dev/null http://localhost:4021/weather \
 | grep -i '^payment-required:' | sed 's/^payment-required: //I' | tr -d '\r' \
 | base64 -d | python3 -m json.tool
```

You should see an `"extensions": { "bazaar": { "info": {...}, "schema": {...} } }` block
alongside `accepts`.

---

## 4. Deploy to a public URL

The catalog needs a publicly reachable URL. This project deploys the seller to **Railway**.

```bash
railway link -p <project> -e production      # link the repo to the service
railway up --ci                              # build + deploy, stream build logs
```

### Gotcha we hit: "No start command detected"

Railway's Railpack builder could not auto-detect a start command for the npm-workspace
monorepo (it found 3 packages but no root `start` script). Fix: a root `railway.json` that
points the build/start at the seller workspace:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build":  { "builder": "RAILPACK", "buildCommand": "npm run build --workspace=seller" },
  "deploy": { "startCommand": "node seller/dist/index.js", "restartPolicyType": "ON_FAILURE", "restartPolicyMaxRetries": 10 }
}
```

The seller binds to Railway's injected `PORT` automatically (`process.env.PORT ?? 4021`).
Set `SELLER_ADDRESS`, `FACILITATOR_URL`, and `UI_ORIGIN` as service variables in Railway.

Confirm the deployed 402 carries the extension (same decode as above, against the public URL).

---

## 5. Trigger cataloging — settle a real payment per endpoint

Nothing lists until a payment settles. Run the buyer against the **public** seller URL:

```bash
# GET /weather (buyer/src/index.ts does 3 weather purchases)
SELLER_URL=https://<your-app>.up.railway.app npm run buyer
```

For `/forecast` (GET) and `/analyze` (POST), settle one payment each using `@x402/fetch`
(`x402Client` + `ExactAvmScheme(toClientAvmSigner(...))` + `wrapFetchWithPayment`). See the
buyer's `buyWeather` for the exact signer wiring; the only difference is the path/method/body.

> Each settlement spends real USDC (testnet here). Prices: weather 0.001, forecast 0.005,
> analyze 0.002 USDC. A transient `502` from the edge during settlement is safe to retry.

---

## 6. Verify the listing

### Quick: the REST discovery endpoints

```bash
curl -s 'https://facilitator.goplausible.xyz/discovery/resources?limit=200'   # your routes
curl -s 'https://facilitator.goplausible.xyz/discovery/merchants?limit=200'   # your payTo as a merchant
```

Look for your `resourceUrl`s and, in merchants, your `payTo` under `addresses.avm`.

### Definitive: the way the Bazaar UI does it

`seller/src/verify-bazaar.ts` queries via GoPlausible's own client
(`withBazaar(new HTTPFacilitatorClient(...)).extensions.discovery.listResources()`) — the same
call the Bazaar UI makes — and filters for your `payTo`:

```bash
npm install @x402-avm/core --workspace=seller   # one-time, for the query client
cd seller && npx tsx src/verify-bazaar.ts
```

Expected output:

```
Bazaar catalog total: 4
Resources for 6LQ3EC57Q4…: 3

✓ GET  https://<your-app>/weather   network=algorand:…  price=0.001 USDC  verify=1 settle=3
✓ GET  https://<your-app>/forecast  network=algorand:…  price=0.005 USDC  verify=1 settle=1
✓ POST https://<your-app>/analyze   network=algorand:…  price=0.002 USDC  verify=1 settle=1

✅ Confirmed: 3 resource(s) listed on the GoPlausible Bazaar.
```

---

## 7. Caveats & notes

- **`http://` vs `https://`** — Railway terminates TLS at its edge, so the app sees `http` and
  builds the `resourceUrl` from that; the catalog shows `http://…`. The endpoints are reachable
  over `https`. To list `https`, derive the resource URL from the `x-forwarded-proto` header.
- **Testnet vs mainnet** — `network` reflects `NETWORK` (default `testnet`). For a mainnet
  listing, set `NETWORK=mainnet` on the service and settle a real mainnet USDC payment.
- **Freshness** — the catalog updates `lastSeen` on each settle and re-validates the schema, so
  periodic traffic keeps an entry current.
- **Merchant `resourceCount` lag** — the `/discovery/merchants` aggregate may report fewer
  resources than `/discovery/resources` shows for your `merchantId`; the per-resource endpoint
  is authoritative.

---

## Summary checklist

- [ ] `npm install @x402-avm/extensions --workspace=seller`
- [ ] Import `declareDiscoveryExtension`, `bazaarResourceServerExtension`
- [ ] `resourceServer.registerExtension(bazaarResourceServerExtension as unknown as ResourceServerExtension)`
- [ ] Add `extensions: declareDiscoveryExtension({...})` to every paid route
- [ ] Verify the 402 carries `extensions.bazaar` locally
- [ ] Deploy to a public URL (Railway `railway.json` build/start)
- [ ] Settle one real payment per endpoint against the public URL
- [ ] Verify with `/discovery/resources` and `seller/src/verify-bazaar.ts`

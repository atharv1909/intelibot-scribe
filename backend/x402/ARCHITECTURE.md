# X402 Payment Demo - System Architecture

> Complete system design, component relationships, and data flow for the x402 HTTP payment demo on Algorand TestNet.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Technology Stack](#technology-stack)
- [Deployment Architecture](#deployment-architecture)
- [Security Model](#security-model)
- [Scalability Considerations](#scalability-considerations)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              REACT FRONTEND (localhost:5173)                 │  │
│  │  - React 18.2 with TypeScript                               │  │
│  │  - TailwindCSS + DaisyUI for UI                              │  │
│  │  - Vite for bundling                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓ HTTP                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │         @txnlab/use-wallet-react (Wallet Provider)          │  │
│  │  - Pera Wallet                                              │  │
│  │  - Defly Wallet                                             │  │
│  │  - Lute Wallet                                              │  │
│  │  - Magic (Email)                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓ Wallet Signing                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            Wallet Application (Native/Browser)              │  │
│  │  - Store USDC on TestNet                                    │  │
│  │  - Sign transactions                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               ↓ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│                    HONO RESOURCE SERVER (localhost:4021)            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                MIDDLEWARE STACK                              │  │
│  │  1. CORS Handler                                             │  │
│  │  2. Logging                                                  │  │
│  │  3. X402 Payment Middleware                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                ROUTE HANDLERS                                │  │
│  │  - GET /weather (protected)                                  │  │
│  │  - GET /forecast (protected - optional)                      │  │
│  │  - GET /health (public)                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           X402 RESOURCE SERVER                               │  │
│  │  - HTTPFacilitatorClient connection                          │  │
│  │  - Payment validation logic                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               ↓ HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│            GOPLAUSIBLE FACILITATOR (https://facilitator...)         │
├─────────────────────────────────────────────────────────────────────┤
│  - Verify transaction signatures                                    │
│  - Check sender balance                                             │
│  - Prevent replay attacks                                           │
│  - Broadcast to blockchain                                          │
│  - Confirm settlement                                               │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   ALGORAND TESTNET                                  │
├─────────────────────────────────────────────────────────────────────┤
│  - Verify transaction group                                         │
│  - Execute USDC transfer (10458941)                                 │
│  - Update balances                                                  │
│  - Record on blockchain                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### System Flows

```
FLOW 1: Initial Request (No Payment)
────────────────────────────────────

Browser                 Server              Facilitator         Blockchain
  │                      │                      │                    │
  ├─ GET /weather ──────→│                      │                    │
  │                      │ Check payment-sig    │                    │
  │                      │ (missing)            │                    │
  │  ← 402 Payment ──────│                      │                    │
  │     Required + obj   │                      │                    │
  │                      │                      │                    │

FLOW 2: Payment Signing (User Action)
────────────────────────────────────

Browser            Wallet              x402Client
  │                  │                    │
  ├─ Create x402     │                    │
  │   client ────────→ Create x402Client  │
  │                  │                    │
  ├─ Call fetch ─────→ Wrap fetch        │
  │                  │ with payment       │
  │                  │                    │
  │  ← Parse 402 ────→ Extract payment   │
  │    response       │ object            │
  │                  │                    │
  │  Create 2 txns   ← x402Client        │
  │  ├─ Setup txn    │                    │
  │  └─ Payment txn  │                    │
  │                  │                    │
  ├─ Sign txns ─────→ wallet.sign()      │
  │                  │ (Pera popup)       │
  │  [User confirms] │                    │
  │  ← Signed txns ──│                    │
  │                  │                    │
  │  Create Payment- │                    │
  │  Signature header│                    │
  │                  │                    │

FLOW 3: Settlement (Payment Sent)
────────────────────────────────

Browser             Server           Facilitator        Blockchain
  │                  │                   │                 │
  ├ GET /weather ───→│                   │                 │
  │ + Payment-Sig    │ Extract signed    │                 │
  │                  │ txns from header  │                 │
  │                  │                   │                 │
  │                  ├─ Validate with ──→│                 │
  │                  │ facilitator       │                 │
  │                  │                   │ Verify sigs     │
  │                  │                   │ Check balance   │
  │                  │                   │ Prevent replay  │
  │                  │                   │                 │
  │                  │                   ├─ Broadcast ────→│
  │                  │                   │ transactions    │
  │                  │                   │                 │
  │                  │                   │ ← Execute       │
  │                  │                   │ (4-5 sec)       │
  │                  │                   │                 │
  │                  │  ← Settled ──────│                 │
  │                  │ (confirmed)       │                 │
  │                  │                   │                 │
  │  ← 200 OK ──────│                   │                 │
  │    + data        │                   │                 │
  │                  │                   │                 │
```

---

## Component Architecture

### Frontend Component Tree

```
App (WalletProvider)
│
├── App.tsx
│   └── Hono setup, theme provider
│
├── Home.tsx
│   │
│   ├── ConnectWallet.tsx
│   │   └── Modal with wallet list
│   │       ├── Pera Wallet
│   │       ├── Defly Wallet
│   │       └── Lute Wallet
│   │
│   └── Weather.tsx (Conditional - shown after connection)
│       │
│       ├── handleRequestWeather()
│       │   │
│       │   └── fetchWeatherWithPayment()
│       │       │
│       │       └── createX402Fetch()
│       │           │
│       │           └── x402Client
│       │               ├── Payment creation
│       │               ├── Transaction generation
│       │               └── Signature handling
│       │
│       ├── Payment status display
│       ├── Error display
│       └── Result display (JSON)
│
├── ErrorBoundary.tsx
│   └── Catch component errors
│
└── styles/
    └── main.css (TailwindCSS)

Utils:
├── weatherApi.ts (X402 CORE)
│   ├── createX402Fetch() ⭐⭐
│   ├── fetchWeatherWithPayment() ⭐
│   └── formatWeatherData()
│
└── network/
    └── getAlgoClientConfigs.ts
```

### Backend Route Structure

```
Hono App
│
├─ Middleware Stack (in order)
│  ├─ CORS Handler (FIRST - critical!)
│  ├─ Logging Middleware
│  └─ X402 Payment Middleware
│
├─ Protected Routes (require payment)
│  ├─ GET /weather
│  │  └─ Returns: { report: { weather, temperature, timestamp } }
│  │
│  └─ GET /forecast (optional)
│     └─ Returns: forecast data
│
├─ Public Routes (no payment)
│  ├─ GET /health
│  │  └─ Returns: { status: 'ok' }
│  │
│  └─ 404 Handler
│     └─ Returns: { error: 'Not found' }
│
└─ Server Config
   ├─ Port: 4021
   └─ Listen on all interfaces
```

### Payment Verification Pipeline

```
Incoming Request
    ↓
[CORS Middleware]
    │ MUST be first to handle OPTIONS preflight
    │ Sets Access-Control-Allow-Headers: *
    │ Sets Access-Control-Expose-Headers: *
    ↓
[Logging Middleware]
    │ Log method, path, headers for debugging
    ↓
[X402 Payment Middleware]
    │
    ├─→ Check for Payment-Signature header
    │
    ├─ If MISSING:
    │  ├─ Create payment object
    │  ├─ Set Price, Network, Receiver, Asset
    │  ├─ Return 402 Payment Required
    │  └─ Browser receives 402 + payment details
    │
    └─ If PRESENT:
       ├─ Extract signed transactions
       ├─ Call facilitator.validate()
       │  ├─ Verify ECDSA signatures
       │  ├─ Check sender balance
       │  ├─ Prevent replay attacks
       │  └─ Broadcast to blockchain
       │
       ├─ If valid:
       │  └─ Allow request to continue → Handler
       │
       └─ If invalid:
          └─ Return 402 again (retry)
    ↓
[Route Handler]
    │ Only reached after payment verified
    ├─ GET /weather → Return weather JSON
    ├─ GET /health → Return health status
    ↓
Response (200 OK + data)
```

---

## Data Flow Diagrams

### Complete Payment Cycle

```
TIME ─────────────────────────────────────────────────────────────→

T0: Initial Request
────────────────────
Browser              GET /weather (no auth)
                     ↓
                     Server checks: No Payment-Signature header
                     ↓
                     Server creates payment object:
                     {
                       sender: wallet_address,
                       receiver: KJ47QTT3...,
                       amount: 5000,
                       assetId: 10458941 (USDC),
                       network: algorand:SGO1...,
                       scheme: exact
                     }
                     ↓
Browser receives:    402 Payment Required + payment object
                     ↓
                     Browser passes to x402Client

T1-T5: User Signs (5-30 seconds)
─────────────────
Browser              x402Client creates 2 transactions:
                     ├─ txn[0]: Setup (acfg)
                     └─ txn[1]: Payment (axfer, 0.005 USDC)
                     ↓
Browser              Calls wallet.signTransactions([txn0, txn1])
                     ↓
Wallet (Pera)        Shows signing prompt:
                     ├─ Sign Setup Transaction
                     ├─ Sign Payment Transaction (0.005 USDC)
                     └─ [Confirm] [Cancel]
                     ↓
User                 [Clicks Confirm]
                     ↓
Wallet               Returns signed transactions:
                     [null, signed_txn1_bytes]
                     ↓
Browser              Maps back to array:
                     [txn0_unsigned, signed_txn1]
                     ↓
x402Client           Creates Payment-Signature header:
                     base64({
                       x402Version: 2,
                       payload: {
                         paymentGroup: [txn0, signed_txn1],
                         paymentIndex: 1
                       }
                     })

T5+: Retry with Payment
──────────────────────
Browser              GET /weather
                     + Payment-Signature: eyJ...
                     ↓
Server               Extracts Payment-Signature header
                     ↓
X402Middleware       Calls facilitator.validate(signature)
                     ↓
Facilitator          Validates:
                     ├─ ECDSA signatures: ✓
                     ├─ Sender balance: ✓ (has 0.005+ USDC)
                     ├─ Not replayed: ✓
                     └─ Amount correct: ✓
                     ↓
Facilitator          Broadcasts to Algorand TestNet
                     ├─ Submit transaction group
                     ├─ Wait for confirmation (4-5 sec)
                     └─ Confirm settlement
                     ↓
Server               Receives: { settled: true }
                     ↓
Route Handler        Executes GET /weather
                     ↓
Browser              Receives: 200 OK + {
                       report: {
                         weather: 'sunny',
                         temperature: 70,
                         timestamp: ...
                       }
                     }
                     ↓
                     [Display in UI]
```

### Transaction Group Structure

```
Payment Lifecycle
─────────────────

Unsigned (Before Signing):
┌─────────────────────────────────────────┐
│ Transaction Group (to be signed)        │
├─────────────────────────────────────────┤
│ [0] Setup Transaction (acfg)            │
│     - Sender: wallet address            │
│     - AppIndex: facilitator app         │
│     - Action: Setup payment group       │
│     - Signature: [EMPTY]                │
├─────────────────────────────────────────┤
│ [1] Payment Transaction (axfer)         │
│     - Sender: wallet address            │
│     - Receiver: server address          │
│     - AssetIndex: 10458941 (USDC)       │
│     - Amount: 5000 (0.005 USDC)         │
│     - Signature: [EMPTY]                │
└─────────────────────────────────────────┘

After Wallet Signing:
┌─────────────────────────────────────────┐
│ Transaction Group (signed)              │
├─────────────────────────────────────────┤
│ [0] Setup Transaction (acfg)            │
│     - Signature: [64-byte ECDSA sig]    │
├─────────────────────────────────────────┤
│ [1] Payment Transaction (axfer)         │
│     - Signature: [64-byte ECDSA sig]    │
└─────────────────────────────────────────┘

After Facilitator Broadcasts:
┌─────────────────────────────────────────┐
│ On-Chain Confirmation                   │
├─────────────────────────────────────────┤
│ TxnID: ZSKIJ...                         │
│ Round: 45000150                         │
│ Status: CONFIRMED                       │
│ Effects:                                │
│ - Facilitator app state updated         │
│ - USDC transferred to receiver          │
│ - Settlement recorded                   │
└─────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

```
Core Framework:
├─ React 18.2.0         → UI component library
├─ TypeScript 5.1.6     → Type safety
└─ Vite 4.4.9           → Build tool

X402 Payment:
├─ @x402-avm/fetch 2.6.1        → HTTP 402 client
├─ @x402-avm/core 2.6.1         → Core protocol
└─ @x402-avm/avm 2.6.1          → Algorand implementation

Wallet Integration:
└─ @txnlab/use-wallet-react 3.0.0 → Multi-wallet provider

Blockchain:
├─ algosdk 2.x                   → Algorand SDK
└─ (optional) @algorandfoundation/algokit-utils

Styling:
├─ TailwindCSS 3.3.2             → Utility CSS
├─ DaisyUI 3.9.4                 → Component library
└─ PostCSS 8.4.27                → CSS processing

Dev Tools:
├─ TypeScript                    → Type checking
├─ Vite                          → Dev server + bundling
└─ ESLint                        → Code linting
```

### Backend

```
Framework:
├─ Hono 4.x             → Lightweight web framework
└─ @hono/node-server    → Node.js HTTP server

X402 Payment:
├─ @x402/hono           → Hono middleware
├─ @x402/core           → Core server-side logic
└─ @x402/avm/exact      → Algorand ExactAvmScheme

Environment:
├─ dotenv               → Environment variables
└─ Node.js 18+          → Runtime

Runtime:
├─ tsx                  → TypeScript executor
└─ ts-node (optional)   → TypeScript REPL
```

### External Services

```
Blockchain:
├─ AlgoNode (Frontend)  → https://testnet-api.algonode.cloud
├─ Algorand TestNet     → Public blockchain
└─ USDC Token (10458941)→ Standard Asset

Payment Infrastructure:
└─ GoPlausible Facilitator → https://facilitator.goplausible.xyz
   └─ Verifies & settles payments
```

---

## Deployment Architecture

### Local Development

```
Developer Machine
├─ Frontend (npm run dev)
│  ├─ Vite dev server on localhost:5173
│  ├─ Hot module replacement (HMR)
│  └─ Connected to local backend
│
└─ Backend (npx tsx index.ts)
   ├─ Hono server on localhost:4021
   ├─ File watching (auto-reload)
   └─ Connected to TestNet facilitator
```

### Production Deployment

```
Production Environment
│
├─ Frontend (Static hosting)
│  ├─ Option 1: Vercel
│  │  ├─ npm run build
│  │  ├─ Deploy dist/
│  │  └─ CDN distribution
│  │
│  ├─ Option 2: Netlify
│  │  ├─ npm run build
│  │  ├─ Deploy dist/
│  │  └─ Automatic deploys from Git
│  │
│  └─ Option 3: Self-hosted
│     ├─ npm run build
│     ├─ Serve with nginx/Apache
│     └─ HTTPS required
│
├─ Backend (API server)
│  ├─ Option 1: AWS Lambda/ECS
│  │  ├─ Docker: node:18 + tsx
│  │  ├─ Auto-scaling
│  │  └─ CloudFront CDN
│  │
│  ├─ Option 2: DigitalOcean/Linode
│  │  ├─ VPS with Node.js
│  │  ├─ PM2 for process management
│  │  └─ Nginx reverse proxy
│  │
│  └─ Option 3: Heroku
│     ├─ Procfile with tsx startup
│     ├─ Environment variables
│     └─ Auto-scaling dynos
│
└─ Domain & DNS
   ├─ Frontend: app.example.com
   ├─ Backend: api.example.com
   └─ HTTPS: Let's Encrypt / CloudFlare
```

---

## Security Model

### Request Authentication

```
x402 Payment as Authentication Method:

Traditional:              x402:
┌──────────────────┐     ┌──────────────────┐
│ API Key/JWT      │     │ Payment Proof    │
├──────────────────┤     ├──────────────────┤
│ - Sent in header │     │ - Signed txns    │
│ - Checked server │     │ - Verified chain │
│ - Static token   │     │ - One-time use   │
│ - Shared secret  │     │ - Blockchain     │
│                  │     │   confirmed      │
│ ⚠️ Single point  │     │ ✅ Cryptographic│
│   of failure     │     │    proof of      │
│                  │     │    payment       │
└──────────────────┘     └──────────────────┘
```

### Transaction Signing

```
ECDSA Signature Process:

1. x402Client creates transactions
   ├─ Serialize transaction bytes
   ├─ Calculate hash
   └─ Ready for signing

2. Wallet signs with private key
   ├─ Private key never leaves wallet
   ├─ Sign operation is local
   └─ Return signed transaction

3. Server verifies signature
   ├─ Public key from sender
   ├─ Recover from signature
   ├─ Verify authenticity
   └─ Check not replayed
```

### Replay Protection

```
Facilitator Prevents Replay:

First Payment:
GET /weather + Payment-Signature: sig1
       ↓
Server: Accepts, broadcasts to chain
       ↓
Records: txn_hash = abc123

Second Payment Attempt (same signature):
GET /weather + Payment-Signature: sig1
       ↓
Facilitator: Checks txn_hash = abc123
       ↓
Finds: Already settled on-chain
       ↓
Returns: REJECTED (replay attempt)
```

### Network Security

```
Frontend → Server:
├─ HTTP (localhost dev) → ✅ OK
└─ HTTPS (production) → ✅ REQUIRED
   ├─ TLS 1.2+
   ├─ Certificate validation
   └─ CORS checks

Server → Facilitator:
├─ HTTPS (facilitator.goplausible.xyz)
├─ Server certificate verified
└─ Payment signature in POST body

Wallet → Frontend:
├─ In-app communication
├─ No network exposure
└─ Private key never leaves app
```

---

## Scalability Considerations

### Performance Metrics

```
Request Timeline:
┌─────────────────────────────────────────┐
│ Phase          │ Duration │ Bottleneck  │
├────────────────┼──────────┼─────────────┤
│ Initial request│ 10ms     │ Server      │
│ User signs     │ 5-30s    │ User/Wallet │
│ Facilitator    │ 200-500ms│ Network     │
│ Chain confirm  │ 4-5s     │ Blockchain  │
├────────────────┼──────────┼─────────────┤
│ Total: 5-40s   │ (dominated by user action)
└─────────────────────────────────────────┘
```

### Load Considerations

```
Concurrent Users:
└─ 10 users:   ✅ Single server fine
└─ 100 users:  ✅ Consider caching
└─ 1000 users: ⚠️ Need load balancing
└─ 10k users:  ⚠️ Facilitator bottleneck

Facilitator Capacity:
├─ Manages signature verification
├─ Broadcasts to Algorand
├─ Tracks settlement state
└─ Rate limiting:
   └─ GoPlausible: Check docs for limits

Blockchain Limitations:
├─ Algorand: ~1000 txns/sec capacity
├─ Testnet: Usually lower
└─ Settlement: 4-5 sec confirmation
```

### Optimization Strategies

```
For Higher Scale:

1. Caching Layer
   ├─ Cache responses after payment
   ├─ Reduce database hits
   └─ Use Redis/Memcached

2. Batch Processing
   ├─ Combine small payments
   ├─ Reduce blockchain traffic
   └─ Lower costs

3. Load Balancing
   ├─ Multiple server instances
   ├─ Round-robin DNS
   └─ Health checks

4. CDN + Static Content
   ├─ Cache after payment
   ├─ Global edge servers
   └─ Reduced origin load

5. Database Optimization
   ├─ Index payment lookups
   ├─ Archive old records
   └─ Connection pooling
```

---

## Monitoring & Observability

### Key Metrics to Track

```
Server Metrics:
├─ Request count
├─ Response time
├─ Error rate (402s, 5xx)
├─ Middleware timing
└─ Handler execution time

Payment Metrics:
├─ Successful payments
├─ Failed verifications
├─ Facilitator response time
├─ Blockchain confirmation time
└─ Replay attempts

User Metrics:
├─ Wallet connections
├─ Signing attempts
├─ Payment completion rate
└─ Conversion funnel
```

### Logging Strategy

```
Frontend Logs:
├─ x402Client initialization
├─ Transaction creation
├─ Wallet signing events
├─ Retry attempts
└─ Success/failure

Server Logs:
├─ All requests (method, path)
├─ Payment verification attempts
├─ Facilitator responses
├─ Handler execution
└─ Errors with context

Facilitator Logs:
├─ Signature verification
├─ Replay detection
├─ Blockchain submission
└─ Settlement confirmation
```

---

## Future Enhancements

```
Potential Improvements:

1. Multi-Asset Support
   ├─ Accept ALGO as payment
   ├─ Accept other ASAs
   └─ Dynamic pricing in multiple assets

2. Subscription Model
   ├─ Monthly payment plans
   ├─ Recurring billing
   └─ Rate limiting per tier

3. Analytics Dashboard
   ├─ Payment history
   ├─ Revenue tracking
   ├─ User analytics
   └─ Real-time monitoring

4. Self-Hosted Facilitator
   ├─ Full control
   ├─ No external dependency
   ├─ Custom validation rules
   └─ Higher throughput

5. Mobile App Integration
   ├─ Native wallet support
   ├─ Deep linking
   └─ Push notifications

6. Refund/Chargeback System
   ├─ Customer support workflows
   ├─ Dispute resolution
   └─ Reverse transactions

7. International Support
   ├─ Multi-currency pricing
   ├─ Localization
   └─ Regional facilitators
```

---

## Architecture Decision Records (ADRs)

### ADR-1: Use ExactAvmScheme

**Decision:** Use ExactAvmScheme (ECDSA) instead of other schemes

**Rationale:**
- ✅ Algorand native support
- ✅ Battle-tested with Pera/Defly wallets
- ✅ Good performance
- ✅ Well-documented

---

### ADR-2: Manual CORS Middleware

**Decision:** Implement manual CORS instead of hono/cors

**Rationale:**
- ✅ x402 headers aren't compatible with Hono's built-in CORS
- ✅ Need wildcard headers for Payment-Signature/Response
- ✅ Must handle OPTIONS before other middleware
- ✅ Greater control over preflight behavior

---

### ADR-3: GoPlausible Facilitator

**Decision:** Use GoPlausible hosted facilitator vs self-hosted

**Rationale:**
- ✅ Zero setup required
- ✅ Managed service
- ✅ Scales automatically
- ✅ Free to use
- ⚠️ External dependency (OK for MVP)

---

### ADR-4: Vite + React

**Decision:** Use modern Vite instead of Create React App

**Rationale:**
- ✅ 10x faster builds
- ✅ Better HMR
- ✅ Smaller bundle
- ✅ Active community
- ✅ Works well with TypeScript

---

## Appendix: Related Documentation

- [X402_CRITICAL_REFERENCE.md](./X402_CRITICAL_REFERENCE.md) - Quick reference
- [X402_IMPLEMENTATION_GUIDE.md](./X402_IMPLEMENTATION_GUIDE.md) - Complete guide
- [x402-demo-server/README.md](./x402-demo-server/README.md) - Backend docs
- [X402-Usecase/README_X402.md](./X402-Usecase/projects/X402-Usecase/README_X402.md) - Frontend docs

---

**Version:** 1.0  
**Last Updated:** May 18, 2026  
**Status:** Production Ready ✅  
**Maintainer:** X402 Demo Team

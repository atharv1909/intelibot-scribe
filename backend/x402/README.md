# 🚀 x402 Hackathon Starter Kit

> **Build payment-protected APIs in 55 minutes** using the x402 HTTP payment protocol on Algorand.

## Table of Contents

- [What is x402?](#what-is-x402)
- [Quick Start (5 minutes)](#quick-start-5-minutes)
- [Project Structure](#project-structure)
- [How to Add an Endpoint (10 minutes)](#how-to-add-an-endpoint-10-minutes)
- [Example Ideas](#example-ideas)
- [Testing Your Endpoint](#testing-your-endpoint)
- [Troubleshooting](#troubleshooting)
- [Useful Commands](#useful-commands)

---

## What is x402?

**x402** is a payment-protected HTTP protocol based on the classic HTTP 402 Payment Required status code.

### How it works in 3 steps:

```
1. Client makes request
   GET /weather
   ↓
2. Server requires payment
   ← 402 Payment Required
   ↓
3. Client signs & retries with payment
   GET /weather + Payment-Signature: [...signed transaction...]
   ↓
4. Server validates & returns data
   200 OK + { weather_data }
```

### Key Benefits:

✅ **Micropayments** - Charge fractions of a cent  
✅ **No Subscriptions** - Pay per use  
✅ **Blockchain Verified** - Payments are on-chain  
✅ **No Middleman** - Peer-to-peer payments  
✅ **Instant Settlement** - Payments complete in seconds  

---

## Quick Start (5 minutes)

### Prerequisites

- **Node.js** 18+ and npm
- **Algorand Wallet** connected to TestNet with **0.01+ USDC**
  - Download: [Pera Wallet](https://perawallet.app) or [Defly](https://defly.io)
  - Get TestNet USDC: [AlgoFaucet](https://dispenser.testnet.algorand.network)

### Setup

**1. Install dependencies**

```bash
# Backend
cd x402-demo-server
npm install

# Frontend (in separate terminal)
cd X402-Usecase/projects/X402-Usecase
npm install
```

**2. Configure environment**

**Backend** - Create `.env` in `x402-demo-server/`:

```env
AVM_ADDRESS=YOUR_WALLET_ADDRESS_HERE
FACILITATOR_URL=https://facilitator.goplausible.xyz
PORT=4021
```

Get your wallet address from your Pera/Defly wallet (copy it)

**Frontend** - Create `.env.local` in `X402-Usecase/projects/X402-Usecase/`:

```env
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_NETWORK=testnet
VITE_API_BASE_URL=http://localhost:4021
VITE_FACILITATOR_URL=https://facilitator.goplausible.xyz
```

**3. Start servers**

```bash
# Terminal 1 - Backend (from x402-demo-server/)
npm start

# Terminal 2 - Frontend (from X402-Usecase/projects/X402-Usecase/)
npm run dev
```

**4. Open browser**

```
http://localhost:5173
```

**5. Test payment flow**

- Connect wallet → Request weather → Approve in wallet → See data ✅

---

## Project Structure

```
x402-demo-server/
│
├── index.ts                 ⭐ Main server (DO NOT EDIT)
├── endpoints.config.ts      📝 Define your payment routes here
├── handlers/
│   ├── weather.ts           📦 Example: Basic handler
│   ├── analytics.ts         📦 Example: Analytics endpoint
│   ├── ai-analysis.ts       📦 Example: AI/LLM integration
│   └── creator-content.ts   📦 Example: Creator monetization
│
├── package.json
├── .env                     🔑 Your wallet & config
└── tsconfig.json
```

---

## How to Add an Endpoint (10 minutes)

### Step 1: Define endpoint in config

**File:** `endpoints.config.ts`

Uncomment or add your endpoint to `createPaymentConfig()`:

```typescript
'GET /my-api': {
  accepts: [{
    scheme: 'exact',
    price: '$0.005',              // Price in USDC
    network: ALGORAND_TESTNET_CAIP2,
    payTo: avmAddress,
    extra: { asset: USDC_TESTNET_ASA_ID },
  }],
  description: 'Description of what users pay for',
},
```

### Step 2: Create handler

**File:** `handlers/my-api.ts`

```typescript
import type { Context } from 'hono';

export function handleMyApiRequest(c: Context) {
  try {
    console.log('✓ PAYMENT VERIFIED - handler executing');
    
    // Your business logic here
    // - Fetch external API
    // - Query database  
    // - Compute something
    // - Return data
    
    return c.json({
      data: 'Your response here',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Failed' }, 500);
  }
}
```

### Step 3: Register handler

**File:** `index.ts`

At the top, import your handler:

```typescript
import { handleMyApiRequest } from './handlers/my-api';
```

Then register the route (in ROUTE HANDLERS section):

```typescript
app.get('/my-api', handleMyApiRequest);
```

### Step 4: Test

```bash
curl http://localhost:4021/my-api
# Should see 402 Payment Required ✓
```

Then test in browser at `http://localhost:5173`

---

## Example Ideas

### 🎯 Fast Ideas for 55-Minute Hackathon

#### 1. **Pay-Per-Query AI API**
```
Flow: User pays → Get AI analysis → Return results

Endpoint: POST /ai-query
Price: $0.001 per request
Implementation: Call OpenAI/Hugging Face API

Handler Template: ai-analysis.ts (already exists!)
```

#### 2. **Premium Weather/Sports Data**
```
Flow: User pays → Get real-time data → Return JSON

Endpoint: GET /sports-data
Price: $0.005 per request  
Implementation: Fetch from free API, add your data

Handler Template: weather.ts
```

#### 3. **Analytics Dashboard**
```
Flow: User pays → Get metrics → Return analytics

Endpoint: GET /user-analytics?user_id=123
Price: $0.01 per report
Implementation: Query database, compute stats

Handler Template: analytics.ts (already exists!)
```

#### 4. **Creator Content Platform**
```
Flow: User pays creator → Get exclusive content

Endpoint: GET /exclusive/:id
Price: Creator sets price
Implementation: Store content, track payouts

Handler Template: creator-content.ts (already exists!)
```

#### 5. **Image/File Processing**
```
Flow: User pays → Upload file → Process → Return result

Endpoint: POST /process-image
Price: $0.02 per image
Implementation: Use PIL/ImageMagick, return result

Technologies: Multer for uploads, Sharp for images
```

#### 6. **Code Analysis Tool**
```
Flow: User pays → Submit code → Analyze → Return report

Endpoint: POST /analyze-code
Price: $0.001 per file
Implementation: Use ESLint/SonarQube for analysis

Technologies: Abstract Syntax Tree parsing
```

#### 7. **NFT/Content Marketplace**
```
Flow: Buy content → Pay once → Unlock forever

Endpoint: GET /nft/:id/unlock
Price: Per NFT (stored in metadata)
Implementation: Verify payment, return unlock key

Technologies: IPFS for content, JSON for metadata
```

#### 8. **Rate Limiter + Caching**
```
Flow: User makes requests → Hits limit → Pay for extra

Endpoint: GET /unlimited-access
Price: $0.1 for 24hr unlimited
Implementation: Cache bust, track access count

Technologies: Redis for caching
```

#### 9. **Data Export Service**
```
Flow: User selects data → Pays → Exports CSV/JSON

Endpoint: POST /export
Price: $0.05 per export
Implementation: Query DB, format, return file

Technologies: CSV/Excel generation libraries
```

#### 10. **API Gateway / Proxy**
```
Flow: User pays → Bypass rate limits → Access API

Endpoint: GET /proxy?url=...
Price: Depends on target API
Implementation: Forward request, add auth

Technologies: Axios for HTTP forwarding
```

---

## Testing Your Endpoint

### Test 1: Without Payment (Should return 402)

```bash
curl -i http://localhost:4021/my-api
```

Expected response:
```
HTTP/1.1 402 Payment Required
Payment-Response: {...payment object...}
```

### Test 2: In Browser (Full Flow)

1. Navigate to `http://localhost:5173`
2. Connect wallet (Pera/Defly)
3. Click "Request Weather" (or your endpoint)
4. Approve in wallet
5. See payment success & data ✅

### Test 3: Check Server Logs

In terminal where backend is running:

```
✓ PAYMENT VERIFIED - GET /my-api handler executing
Response: 200
```

---

## Troubleshooting

### ❌ "402 Payment Required" keeps returning

**Causes:**
- Wallet not connected
- No USDC in wallet (need 0.005+ minimum)
- Wallet on wrong network (must be TestNet)

**Fix:**
1. Check wallet has USDC: `https://dispenser.testnet.algorand.network/`
2. Switch to TestNet in wallet settings
3. Copy your TestNet address to `AVM_ADDRESS` in `.env`

### ❌ "CORS error" in browser console

**Cause:** CORS middleware not working

**Fix:**
- Restart backend: `npm start`
- Check CORS is enabled in `index.ts` (should be there)

### ❌ Cannot connect to facilitator

**Cause:** Offline or wrong URL

**Fix:**
```bash
# Test facilitator
curl https://facilitator.goplausible.xyz/health
```

Should return `{"status":"ok"}`

### ❌ "undefined" error in handlers

**Cause:** Not accessing context properties correctly

**Fix:**
```typescript
// ✅ CORRECT
const value = c.req.query('param');
const body = await c.req.json();

// ❌ WRONG
const value = c.query.param;
```

---

## Useful Commands

### Development

```bash
# Start backend (auto-reload)
npm run dev

# Start frontend (auto-reload)
npm run dev

# Build frontend
npm run build

# Build backend
npm run build
```

### Testing

```bash
# Check if server is running
curl http://localhost:4021/health

# Get server info
curl http://localhost:4021/info

# Test payment endpoint
curl http://localhost:4021/weather

# View server logs (in running terminal)
# Watch for: ✓ PAYMENT VERIFIED
```

### Debugging

```bash
# Check ports are free
lsof -i :4021  # Backend
lsof -i :5173  # Frontend

# Kill process using port
lsof -ti:4021 | xargs kill -9
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│             YOUR BROWSER                         │
├──────────────────────────────────────────────────┤
│  React Frontend (localhost:5173)                 │
│  ├─ Connect Wallet (Pera/Defly)                 │
│  ├─ Make payment request                        │
│  ├─ Wallet signs transaction                    │
│  └─ Display results                             │
└──────────────────────────────────────────────────┘
                      ↓ HTTP
┌──────────────────────────────────────────────────┐
│         YOUR BACKEND SERVER                      │
├──────────────────────────────────────────────────┤
│  Hono Server (localhost:4021)                    │
│  ├─ CORS Middleware                             │
│  ├─ x402 Payment Middleware                     │
│  ├─ Your Handlers                               │
│  └─ Verify payment → Return data                │
└──────────────────────────────────────────────────┘
                      ↓ HTTPS
┌──────────────────────────────────────────────────┐
│      GOPLAUSIBLE FACILITATOR                     │
├──────────────────────────────────────────────────┤
│  ├─ Verify transaction signatures               │
│  ├─ Check wallet balance                        │
│  ├─ Broadcast to blockchain                     │
│  └─ Confirm payment settled                     │
└──────────────────────────────────────────────────┘
```

---

## Key Files to Know

| File | Purpose | Edit? |
|------|---------|-------|
| `endpoints.config.ts` | Define payment routes | ✏️ **YES** |
| `handlers/*.ts` | Handle requests | ✏️ **YES** |
| `index.ts` | Main server | ⚠️ Be careful |
| `.env` | Configuration | ✏️ **YES** |
| `package.json` | Dependencies | ⚠️ Only if adding packages |

---

## Submission Checklist

- [ ] Backend running on localhost:4021
- [ ] Frontend running on localhost:5173  
- [ ] At least 1 payment-protected endpoint
- [ ] Endpoint defined in `endpoints.config.ts`
- [ ] Handler created in `handlers/` directory
- [ ] Handler registered in `index.ts`
- [ ] Can test flow in browser (Connect → Request → Pay → See Data)
- [ ] Console shows "✓ PAYMENT VERIFIED" when successful
- [ ] Clear error messages if something fails
- [ ] README.md updated with your endpoint documentation

---

## During Presentation (3 minutes)

**Pitch (2 min):**
- What problem does your idea solve?
- How does x402 improve it?
- Who is the customer?

**Demo (1 min):**
- Show wallet connected
- Show payment flow
- Show data returned
- Boom! 💥

---

## Resources

- 📚 [x402 Specification](https://x402.money)
- 🧠 [Complete Implementation Guide](./X402_IMPLEMENTATION_GUIDE.md)
- 🚀 [Architecture Documentation](./ARCHITECTURE.md)
- 🎯 [Critical Code Reference](./X402_CRITICAL_REFERENCE.md)
- 🔗 [Pera Wallet Docs](https://docs.perawallet.app)
- ⛓️ [Algorand Developer Docs](https://developer.algorand.org)

---

## Support During Event

**Questions?**
- Check Troubleshooting section ☝️
- Look at example handlers for patterns
- Read console error messages carefully
- Ask AlgoBharat mentors nearby

**Common Mistakes:**
- Forgetting `.env` file
- Wrong AVM_ADDRESS (copy from wallet)
- Not restarting backend after changes
- Testing without wallet connected
- Using MainNet instead of TestNet

---

## Next Steps After Hackathon

- 🚀 Deploy to production (Vercel, Heroku, AWS)
- 💰 Add more endpoints
- 📊 Track payments and analytics
- 🔐 Add authentication/authorization
- 🌍 Go to MainNet with real USDC
- 🏆 Build a real business!

---

**Happy building! 🎉**

**Let's monetize the internet one x402 endpoint at a time.**

---

**Created for: x402 Build & Arena Hackathon**  
**Difficulty Level:** Beginner-Friendly  
**Time to Complete:** ~55 minutes  
**Complexity:** Simple but complete

# X402 Frontend - React + Vite Documentation

> A complete React frontend for the x402 payment demo showcasing wallet integration and HTTP 402 payment flow.

## Overview

This is a modern React/Vite frontend that demonstrates:
- **Algorand wallet connection** (Pera, Defly, Lute wallets)
- **x402 payment signing** with 2-transaction flow
- **HTTP 402 Payment Required** handling
- **TypeScript** for type safety
- **TailwindCSS + DaisyUI** for responsive UI

**User Journey:**
1. User lands on page
2. Connects Algorand wallet
3. Clicks "Request Weather"
4. App creates 2 transactions and sends to wallet
5. User signs in wallet
6. App sends signed transactions to server
7. Server verifies payment with facilitator
8. Returns weather JSON data
9. Data displayed on page

---

## Quick Start

### Prerequisites
- Node.js >=20.0
- npm >=9.0
- Algorand TestNet wallet with USDC (0.005+ USDC minimum)

### Installation

```bash
cd X402-Usecase/projects/X402-Usecase
npm install
```

### Configuration

Create `.env.local` file in project root:

```env
# Algorand TestNet Configuration
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_NETWORK=testnet

# X402 API
VITE_API_BASE_URL=http://localhost:4021
VITE_FACILITATOR_URL=https://facilitator.goplausible.xyz
```

**Variables:**
- `VITE_ALGOD_SERVER`: AlgoNode testnet endpoint
- `VITE_ALGOD_NETWORK`: Network name (testnet/mainnet)
- `VITE_API_BASE_URL`: Backend resource server URL
- `VITE_FACILITATOR_URL`: x402 facilitator URL

### Running

**Development:**
```bash
npm run dev
```
Opens at `http://localhost:5173`

**Build for Production:**
```bash
npm run build
npm run preview
```

---

## Architecture

### Component Structure

```
src/
├── App.tsx                          # Root + Wallet Provider
├── Home.tsx                         # Landing page
├── components/
│   ├── ConnectWallet.tsx            # Wallet connection modal
│   ├── Weather.tsx                  # ⭐ CRITICAL - Payment UI
│   ├── ErrorBoundary.tsx            # Error handling
│   └── Transact.tsx                 # (optional) Transaction component
├── utils/
│   ├── weatherApi.ts                # ⭐ CRITICAL - x402 client logic
│   ├── ellipseAddress.ts            # Address truncation
│   └── network/
│       └── getAlgoClientConfigs.ts  # AlgoClient configuration
└── styles/
    └── main.css                     # TailwindCSS
```

---

## Critical Code Sections

### 1. X402 Client Setup (weatherApi.ts Lines 1-50)

**File:** `src/utils/weatherApi.ts`

```typescript
// ⚠️ CRITICAL: Create x402 client with signer
export async function createX402Fetch(walletSigner: any) {
  console.log('createX402Fetch: initializing for address', walletSigner.address)
  const client = new x402Client()

  // ⚠️ CRITICAL: Store original transactions for fallback
  let originalTxns: Uint8Array[] = []

  // ⚠️ CRITICAL: Define x402 signer that bridges use-wallet to x402
  const x402Signer: ClientAvmSigner = {
    address: walletSigner.address,
    signTransactions: async (txns: Uint8Array[]) => {
      // ... transaction signing logic ...
    },
  }

  // ⚠️ CRITICAL: Register Algorand TestNet scheme
  client.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(x402Signer))
  console.log('x402 client registered for TestNet')

  // Return wrapped fetch that handles 402 responses
  return wrapFetchWithPayment(fetch, client)
}
```

**Why This Matters:**
- `x402Client`: Creates payment client that handles 402 challenges
- `ClientAvmSigner`: Interface between wallet and x402 protocol
- `ExactAvmScheme`: Algorand-specific signing implementation
- `wrapFetchWithPayment`: Automatically retries failed requests with payment signature

**Key Dependency Versions:**
```json
{
  "@x402-avm/core": "^2.6.1",
  "@x402-avm/avm": "^2.6.1",
  "@x402-avm/fetch": "^2.6.1"
}
```

⚠️ **WARNING:** v2.12.0 doesn't exist on npm. Use v2.6.1 (latest stable).

---

### 2. Transaction Signing Logic (weatherApi.ts Lines 18-65)

**File:** `src/utils/weatherApi.ts`

```typescript
signTransactions: async (txns: Uint8Array[]) => {
  try {
    console.log('x402Signer.signTransactions: received', txns.length, 'transaction(s)')
    originalTxns = txns  // ← Save originals for fallback
    
    // ⚠️ CRITICAL: Call wallet's native signing
    console.log('Calling wallet.signTransactions...')
    const walletResult = await walletSigner.signTransactions(txns)
    
    console.log('Wallet returned:', typeof walletResult)
    console.log('Is array?', Array.isArray(walletResult))
    
    // ⚠️ CRITICAL: Handle wallet's mixed response format
    // Wallet returns: [null|Uint8Array, null|Uint8Array, ...]
    // where null = unsigned transaction
    // and Uint8Array = signed transaction
    
    if (Array.isArray(walletResult)) {
      const result = walletResult.map((item: any, i: number) => {
        if (item === null || item === undefined) {
          // Wallet didn't sign this → use original unsigned
          console.log(`Item ${i}: unsigned, using original`)
          return originalTxns[i]
        }
        if (item instanceof Uint8Array) {
          // Already signed
          console.log(`Item ${i}: signed (${item.byteLength} bytes)`)
          return item
        }
        if (typeof item === 'string') {
          // Base64 encoded → convert to Uint8Array
          const binaryString = atob(item)
          const bytes = new Uint8Array(binaryString.length)
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j)
          }
          return bytes
        }
        // Fallback
        return originalTxns[i]
      })
      
      console.log('Returning', result.length, 'transactions')
      return result  // ⚠️ CRITICAL: Return in original order
    }
    
    return walletResult
  } catch (error) {
    console.error('signTransactions error:', error)
    throw error
  }
}
```

**Critical Issues & Fixes:**

| Issue | ❌ Wrong | ✅ Correct |
|-------|---------|-----------|
| **Filter out nulls** | Remove unsigned txns | Keep all txns in order |
| **Encoding** | Convert Uint8Array → base64 → send | Send Uint8Array directly |
| **Response format** | Expect all signed | Expect mixed [null, signed, ...] |
| **Error handling** | Throw on null | Use original as fallback |

**Example Flow:**
```
Input:  [txn_setup(236 bytes), txn_payment(251 bytes)]
        ↓ (sent to wallet)
Wallet Signs: [null, signed_payment(326 bytes)]
        ↓ (convert back)
Output: [txn_setup(236 bytes), signed_payment(326 bytes)]
        ↓ (send to x402)
Success: Both transactions ready for facilitator
```

---

### 3. Payment Request Flow (weatherApi.ts Lines 68-95)

**File:** `src/utils/weatherApi.ts`

```typescript
// ⚠️ CRITICAL: Main function that handles entire payment flow
export async function fetchWeatherWithPayment(
  url: string,
  walletSigner: any,
): Promise<any> {
  try {
    console.log('\n=== fetchWeatherWithPayment START ===')
    console.log('URL:', url)

    // ⚠️ CRITICAL: Create wrapped fetch with x402 client
    const fetchFn = await createX402Fetch(walletSigner)
    console.log('Making request to:', url)

    // Request 1: No authorization → returns 402
    // x402 client automatically:
    // 1. Receives 402 Payment Required
    // 2. Extracts payment object from response
    // 3. Creates 2 transactions (setup + payment)
    // 4. Calls x402Signer.signTransactions()
    // 5. Retries request with Payment-Signature header
    
    const response = await fetchFn(url)
    console.log('Response status:', response.status)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // ⚠️ CRITICAL: Parse response only after payment verified
    const data = await response.json()
    console.log('SUCCESS - Weather data:', data)
    return data
  } catch (error) {
    console.error('FAILED:', error)
    if (error instanceof Error) {
      throw new Error(`Weather API: ${error.message}`)
    }
    throw error
  }
}
```

**How it Works:**

```
Step 1: App calls fetchWeatherWithPayment()
        ↓
Step 2: x402Client.wrapFetchWithPayment() intercepts fetch
        ↓
Step 3: First request to /weather (no auth)
        ↓
Step 4: Server responds: 402 + Payment object
        {
          sender: "wallet_address",
          receiver: "server_address",
          amount: "5000",
          assetId: "10458941",  ← USDC
          network: "algorand:SGO1...",
          ...
        }
        ↓
Step 5: x402Client extracts payment details
        ↓
Step 6: Creates 2 transactions:
        - Setup txn (initialize payment group)
        - Payment txn (5000 microunits USDC)
        ↓
Step 7: Calls x402Signer.signTransactions([txn1, txn2])
        ↓
Step 8: Wallet signs (user sees popup)
        ↓
Step 9: x402Client constructs Payment-Signature header
        (contains signed txns + metadata)
        ↓
Step 10: Retries request with:
        GET /weather
        Payment-Signature: eyJ...
        ↓
Step 11: Server verifies signature with facilitator
        ↓
Step 12: Server returns: 200 + Weather JSON
        ↓
Step 13: App receives data and displays
```

---

### 4. Weather Component (Weather.tsx Lines 1-80)

**File:** `src/components/Weather.tsx`

```typescript
const Weather: React.FC = () => {
  const { activeAddress, signTransactions } = useWallet()
  const [loading, setLoading] = useState(false)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState('')

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4021'
  const weatherUrl = `${apiBaseUrl}/weather`

  // ⚠️ CRITICAL: Request handler
  const handleRequestWeather = async () => {
    if (!activeAddress) {
      setError('Please connect your wallet first')
      return
    }

    if (!signTransactions) {
      setError('Wallet does not support transaction signing')
      return
    }

    setLoading(true)
    setError('')
    setPaymentStatus('')
    setWeatherData(null)

    try {
      setPaymentStatus('Requesting weather data...')

      // ⚠️ CRITICAL: Create signer object from wallet
      const signer = {
        address: activeAddress,
        signTransactions: signTransactions,  // ← From use-wallet-react
      }

      setPaymentStatus('Processing payment...')
      
      // ⚠️ CRITICAL: Call x402 wrapper function
      const data = await fetchWeatherWithPayment(weatherUrl, signer)

      setPaymentStatus('Payment settled!')
      setWeatherData(data)
      setPaymentStatus('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMsg)
      setPaymentStatus('')
      console.error('Weather request error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      {/* UI Elements */}
      <button
        className={`btn btn-primary ${loading ? 'loading' : ''}`}
        onClick={handleRequestWeather}
        disabled={!activeAddress || loading}
      >
        {loading ? 'Processing...' : 'Request Weather (Pay 0.005 USDC)'}
      </button>
      
      {/* Status display */}
      {paymentStatus && <div className="alert">{paymentStatus}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      
      {/* Results */}
      {weatherData && (
        <div className="alert alert-success">
          ✓ Payment settled and weather received!
        </div>
      )}
    </div>
  )
}
```

**Component State:**
- `activeAddress`: Currently connected wallet address
- `signTransactions`: Wallet's signing function
- `loading`: Request in progress
- `weatherData`: Response from server
- `error`: Error message
- `paymentStatus`: User-facing status ("Processing payment...")

---

### 5. Wallet Connection (ConnectWallet.tsx)

**File:** `src/components/ConnectWallet.tsx`

```typescript
// Uses @txnlab/use-wallet-react
// Supports: Pera, Defly, Lute, Magic, etc.

const ConnectWallet: React.FC<{isOpen: boolean; onClose: () => void}> = ({ isOpen, onClose }) => {
  const { wallets } = useWallet()

  return (
    <dialog open={isOpen} className="modal">
      {wallets.map(wallet => (
        <button
          key={wallet.id}
          onClick={() => {
            wallet.connect()
            onClose()
          }}
        >
          Connect {wallet.name}
        </button>
      ))}
    </dialog>
  )
}
```

**Supported Wallets:**
- ✅ Pera Wallet (iOS/Android/Browser)
- ✅ Defly Wallet
- ✅ Lute Wallet
- ✅ Magic (Email login)
- ✅ MyAlgo (deprecated but supported)

---

## Environment Setup

### Local Development

```bash
# 1. Create .env.local
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_NETWORK=testnet
VITE_API_BASE_URL=http://localhost:4021
VITE_FACILITATOR_URL=https://facilitator.goplausible.xyz

# 2. Start frontend
npm run dev

# 3. In separate terminal, start backend
cd ../../../x402-demo-server
npx tsx index.ts

# 4. Open http://localhost:5173
```

### Production Build

```bash
# Create .env.production or .env.local
VITE_ALGOD_SERVER=https://mainnet-api.algonode.cloud
VITE_ALGOD_NETWORK=mainnet
VITE_API_BASE_URL=https://your-api-domain.com
VITE_FACILITATOR_URL=https://your-facilitator-domain.com

# Build
npm run build

# Output in dist/
# Deploy to Vercel, Netlify, etc.
```

---

## Configuration Files

### tsconfig.json (CRITICAL)

```json
{
  "compilerOptions": {
    "moduleResolution": "Bundler",  // ⚠️ CRITICAL for @x402-avm types
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

⚠️ **Must use `"Bundler"`** - `"Node"` won't resolve @x402-avm types properly!

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4021',
        changeOrigin: true,
      }
    }
  }
})
```

---

## Dependencies

### Critical for x402

```json
{
  "@x402-avm/core": "^2.6.1",      // x402 core library
  "@x402-avm/avm": "^2.6.1",       // Algorand implementation
  "@x402-avm/fetch": "^2.6.1",     // Fetch wrapper for HTTP 402
  "@txnlab/use-wallet-react": "^3.0.0"  // Wallet integration
}
```

### UI/Styling

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "tailwindcss": "^3.3.2",
  "daisyui": "^3.9.4"
}
```

### Dev Tools

```json
{
  "typescript": "^5.1.6",
  "vite": "^4.4.9",
  "@vitejs/plugin-react": "^4.0.3",
  "tailwindcss": "^3.3.2",
  "postcss": "^8.4.27"
}
```

---

## Common Issues & Solutions

### Issue 1: TypeScript Errors for @x402-avm

**Error:**
```
Cannot find module '@x402-avm/fetch' or its declarations
```

**Solution:**
```json
// tsconfig.json - MUST have:
{
  "compilerOptions": {
    "moduleResolution": "Bundler"  // ← Not "Node"
  }
}
```

---

### Issue 2: Wallet Not Signing

**Error:**
```
Wallet does not support transaction signing
```

**Solution:**
```typescript
// Check wallet is connected AND has signTransactions
const { activeAddress, signTransactions } = useWallet()

if (!signTransactions) {
  // Wallet connected but doesn't support signing
  // Try different wallet app
}
```

---

### Issue 3: CORS Blocked

**Error:**
```
Access to fetch blocked by CORS policy
```

**Solution:**
- ✅ Backend CORS middleware must be FIRST
- ✅ Check `Access-Control-Allow-Headers: *`
- ✅ Check `Access-Control-Expose-Headers: *`
- ✅ Hard refresh browser (Cmd+Shift+R)

---

### Issue 4: Always Returns 402

**Causes & Fixes:**

| Issue | Fix |
|-------|-----|
| No USDC in wallet | Get testnet USDC (0.005 minimum) |
| Wrong network (MainNet vs TestNet) | Check VITE_ALGOD_NETWORK |
| Facilitator offline | Verify VITE_FACILITATOR_URL is reachable |
| Incorrect backend address | Check VITE_API_BASE_URL |
| Transactions unsigned | Check wallet popup appeared and was signed |

---

### Issue 5: Wrong Transaction Format

**Symptoms:**
```
signTransactions error: Cannot convert undefined or null to object
```

**Fix:**
```typescript
// ❌ WRONG: Filter out nulls
const signedOnly = walletResult.filter(item => item !== null)

// ✅ CORRECT: Keep nulls, replace with originals
const result = walletResult.map((item, i) => 
  item === null ? originalTxns[i] : item
)
```

---

## Testing Payment Flow

### Manual Testing

**Step 1: Connect Wallet**
```
Click "Connect Wallet" → Select Pera/Defly → Approve
```

**Step 2: Request Weather**
```
Click "Request Weather" → Pera popup appears
```

**Step 3: Sign Transactions**
```
Pera shows 2 transactions:
1. Setup transaction
2. Payment transaction (0.005 USDC)
Click "Sign"
```

**Step 4: Verify Success**
```
Browser console shows:
- "Response status: 200"
- "SUCCESS - Weather data: {...}"

UI shows:
- Green success alert
- JSON weather data displayed
```

---

## Debugging

### Browser Console Logs

Key log statements to watch:

```javascript
// Connection
"createX402Fetch: initializing for address RK6K3..."

// Transaction creation
"x402Signer.signTransactions: received 2 transaction(s)"
"Txn 0: 236 bytes"
"Txn 1: 251 bytes"

// Wallet signing
"Calling wallet.signTransactions..."
"Wallet returned: object"
"Item 0: null"
"Item 1: Uint8Array with 326 bytes"

// Retry with signature
"Making request to: http://localhost:4021/weather"
"Response status: 402"  // First attempt
"Response status: 200"  // After signing

// Success
"SUCCESS - Weather data: {report: {...}}"
```

### Server Console Logs

```
[2026-05-18T08:45:13.271Z] GET /weather
Request Headers: {...}
Response Status: 402

[2026-05-18T08:45:15.404Z] GET /weather
Request Headers: {
  "payment-signature": "eyJ..."
}
Response Status: 200
✓✓✓ PAYMENT VERIFIED - GET /weather handler reached!
```

---

## Extending the App

### Add New Payment Endpoints

**1. Update backend (add new route in server index.ts)**

```typescript
const weatherConfig = {
  'GET /weather': { ... },
  'GET /news': {  // ← NEW
    accepts: [{
      scheme: 'exact',
      price: '$0.01',
      network: ALGORAND_TESTNET_CAIP2,
      payTo: avmAddress,
      extra: { asset: USDC_TESTNET_ASA_ID },
    }],
    description: 'News access',
  },
}
```

**2. Add UI component in frontend**

```typescript
const News: React.FC = () => {
  const handleRequestNews = async () => {
    const data = await fetchWeatherWithPayment(
      'http://localhost:4021/news',
      { address, signTransactions }
    )
    setNewsData(data)
  }
  // ... rest of component
}
```

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                              │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Home.tsx                                                 │ │
│  │ - Connect Wallet button                                  │ │
│  │ - Displays connected address                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                               ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ConnectWallet.tsx                                        │ │
│  │ - Shows available wallets (Pera, Defly, etc.)           │ │
│  │ - Integrates @txnlab/use-wallet-react                    │ │
│  │ - Provides activeAddress + signTransactions             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                               ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Weather.tsx (Protected Component)                        │ │
│  │ - Shown only after wallet connected                      │ │
│  │ - "Request Weather" button calls handler                 │ │
│  │ - Displays loading/error/success states                  │ │
│  │ - Shows formatted JSON response                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                               ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ weatherApi.ts (X402 Client Logic)                        │ │
│  │                                                          │ │
│  │  createX402Fetch() ← ⭐ CRITICAL                          │ │
│  │  - Initialize x402Client                                │ │
│  │  - Register ExactAvmScheme for TestNet                   │ │
│  │  - Create ClientAvmSigner bridge                         │ │
│  │  - Return wrapFetchWithPayment(fetch, client)            │ │
│  │                                                          │ │
│  │  fetchWeatherWithPayment() ← ⭐ CRITICAL                  │
│  │  - Create x402 fetch wrapper                             │ │
│  │  - Call wrapped fetch(url)                               │ │
│  │  - x402 automatically:                                   │ │
│  │    1. Receives 402 + payment object                      │ │
│  │    2. Creates 2 transactions                             │ │
│  │    3. Calls signTransactions()                           │ │
│  │    4. Retries with signature                             │ │
│  │  - Return 200 response + data                            │ │
│  │                                                          │ │
│  │  x402Signer.signTransactions() ← ⭐ CRITICAL              │ │
│  │  - Bridge between wallet + x402                          │ │
│  │  - Call wallet.signTransactions(txns)                    │ │
│  │  - Handle [null, signed] format                          │ │
│  │  - Return in original order                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                               ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Wallet (Pera/Defly)                                      │ │
│  │ - User sees signing prompt                               │ │
│  │ - Confirms 2 transactions                                │ │
│  │ - Returns signed transactions                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                               ↓                                 │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND RESOURCE SERVER                      │
│                  (See x402-demo-server/README)                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Technologies

- **Framework:** React 18.2
- **Build Tool:** Vite 4.4
- **Language:** TypeScript 5.1
- **Styling:** TailwindCSS 3.3 + DaisyUI
- **Wallet Integration:** @txnlab/use-wallet-react
- **x402 Payment:** @x402-avm (v2.6.1)
- **Blockchain:** Algorand TestNet
- **Node Version:** >=20.0

---

## References

- [x402 Protocol](https://x402.money)
- [Algorand Developer](https://developer.algorand.org)
- [use-wallet Documentation](https://txnlab.gitbook.io/use-wallet)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)

---

## License

MIT

---

## Support

For x402 issues:
1. Check browser console for detailed logs
2. Check server console for payment verification logs
3. Verify wallet has TestNet USDC (0.005+ minimum)
4. Verify environment variables in `.env.local`
5. Try different wallet (Pera vs Defly)

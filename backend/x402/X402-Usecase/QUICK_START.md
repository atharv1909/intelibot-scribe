# x402 Build & Arena - Developer Quick Start
**⏱️ You have 55 minutes to build. Let's go!**

---

## ⚡ 5-Minute Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd X402-Usecase/projects/X402-Usecase

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.template .env
# Edit .env: Uncomment TestNet section

# 4. Start frontend
npm run dev
# Opens at http://localhost:5173

# 5. Start server (new terminal)
cd ../../../x402-demo-server
npm install
npm run start
# Runs at http://localhost:4021
```

---

## 🎯 Your Mission

**Build at least 2 working monetized endpoints** that:
1. Accept x402 payment (USDC on Algorand TestNet)
2. Return useful data/service
3. Work end-to-end in browser

**Then:** Show them to the verifier to get Green Cards (required to present to judges)

**Example:** Weather API → Your creative idea 

---

## 🏗️ Build Pattern (Copy This)

### Step 1: Add Backend Endpoint (10 min)

**File:** `x402-demo-server/index.ts`

```typescript
// Add after weather endpoint
app.get('/your-service', x402Middleware, async (c) => {
  // Your service logic here
  const result = {
    service: "Your Service Name",
    data: "Your response data",
    timestamp: new Date().toISOString()
  }
  
  return c.json(result)
})
```

**Test:** `curl http://localhost:4021/your-service`  
(Should return 402 Payment Required)

---

### Step 2: Create Frontend Component (20 min)

**File:** `src/components/YourService.tsx`

```typescript
import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { fetchWeatherWithPayment } from '../utils/weatherApi'

const YourService: React.FC = () => {
  const { activeAddress, signTransactions } = useWallet()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4021'}/your-service`

  const handleRequest = async () => {
    if (!activeAddress) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const signer = {
        address: activeAddress,
        signTransactions: signTransactions,
      }

      const result = await fetchWeatherWithPayment(apiUrl, signer)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Your Service Name</h2>
        
        <button
          className={`btn btn-primary ${loading ? 'loading' : ''}`}
          onClick={handleRequest}
          disabled={!activeAddress || loading}
        >
          {loading ? 'Processing...' : 'Get Service (Pay 0.005 USDC)'}
        </button>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="mockup-code bg-base-200 p-4">
            <pre className="text-xs overflow-auto">
              <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default YourService
```

---

### Step 3: Add to App (5 min)

**File:** `src/Home.tsx`

```typescript
import YourService from './components/YourService'

// Add in the return statement:
<YourService />
```

---

### Step 4: Test Everything (10 min)

1. **Connect Wallet**
   - Click "Connect Wallet"
   - Approve in Pera/Defly/Lute

2. **Make Payment**
   - Click "Get Service"
   - Sign transaction in wallet
   - Wait for response

3. **Verify Transaction**
   - Copy transaction hash from console
   - Visit: https://testnet.algoexplorer.io/tx/[HASH]
   - Confirm USDC transfer

---

## 💡 Service Ideas (Pick One)

### Easy (10-15 min implementation)
- **Random Quote:** Return motivational quote
- **Dad Joke:** Return random joke from array
- **Fortune Teller:** Return daily fortune
- **Timestamp:** Return current time in multiple timezones
- **Hash Generator:** Return SHA256 of input string

### Medium (15-25 min implementation)
- **QR Code:** Generate QR code from text
- **URL Shortener:** Create short URL (mock)
- **Password Generator:** Return secure password
- **JSON Validator:** Validate JSON structure
- **Color Palette:** Return random color scheme

### Advanced (25-35 min implementation)
- **News Headlines:** Fetch from NewsAPI
- **Crypto Prices:** Fetch from CoinGecko
- **Weather (different city):** OpenWeatherMap API
- **GitHub Stats:** Fetch repo info
- **Image Placeholder:** Generate placeholder image

---

## 🔧 Common Code Snippets

### External API Call
```typescript
app.get('/news', x402Middleware, async (c) => {
  const response = await fetch('https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_KEY')
  const data = await response.json()
  return c.json(data)
})
```

### Random Selection
```typescript
const jokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "What do you call a fake noodle? An impasta!",
  "Why did the scarecrow win an award? He was outstanding in his field!"
]

app.get('/joke', x402Middleware, async (c) => {
  const joke = jokes[Math.floor(Math.random() * jokes.length)]
  return c.json({ joke })
})
```

### Data Transformation
```typescript
app.get('/stats', x402Middleware, async (c) => {
  const data = {
    users: Math.floor(Math.random() * 10000),
    revenue: (Math.random() * 100000).toFixed(2),
    growth: (Math.random() * 100).toFixed(1) + '%'
  }
  return c.json(data)
})
```

---

## 🐛 Debugging Checklist

### Payment Not Working?
- [ ] Wallet connected? (Check activeAddress)
- [ ] USDC balance > 0.005? (Check wallet)
- [ ] Opted into USDC? (ASA 10458941)
- [ ] Server running? (Check localhost:4021)
- [ ] Correct network? (TestNet in .env)

### Server Error?
- [ ] Check console for errors
- [ ] Verify .env configuration
- [ ] Restart server: `npm run start`
- [ ] Check facilitator URL

### Frontend Error?
- [ ] Check browser console
- [ ] Verify API URL in component
- [ ] Check CORS (should auto-enable)
- [ ] Try different browser

---

## 📋 Pre-Demo Checklist (Last 10 min)

- [ ] Test payment flow 3 times
- [ ] Prepare transaction hash to show
- [ ] Write down your pitch (2 min)
- [ ] Test on different wallet (if time)
- [ ] Clear console errors
- [ ] Add loading states
- [ ] Add error messages
- [ ] Commit code to Git

---

## 🎤 Pitch Template (2 Minutes)

**Slide 1: Problem (30 sec)**
> "We built [SERVICE NAME]. It solves [PROBLEM] by providing [SOLUTION]. Users pay 0.005 USDC per request."

**Slide 2: Demo (60 sec)**
1. Show disconnected state
2. Connect wallet
3. Click payment button
4. Sign in wallet
5. Show response
6. Show transaction on AlgoExplorer

**Slide 3: Technical (30 sec)**
> "We used x402 SDK for automatic payment handling. Our backend endpoint [EXPLAIN LOGIC]. The payment settles on Algorand TestNet using USDC."

---

## 🚨 Emergency Fixes

### Demo Fails?
- Have backup video recording
- Show transaction hash manually
- Walk through code instead

### Out of USDC?
- Ask judges for test USDC
- Show previous successful transaction
- Explain flow verbally

### Wallet Issues?
- Switch to different wallet
- Use team member's wallet
- Show code + previous test

---

## 📊 What Judges Look For

1. **Does payment work?** (Most important)
2. **Is it different from weather example?**
3. **Does service return valid data?**
4. **Is code clean and typed?**
5. **Are errors handled?**

---

## 🎯 Time Management

```
00:00 - 00:05  →  Setup & planning
00:05 - 00:15  →  Backend endpoint
00:15 - 00:35  →  Frontend component
00:35 - 00:40  →  Integration & testing
00:40 - 00:50  →  Polish & error handling
00:50 - 00:55  →  Final testing & pitch prep
```

---

## 🔗 Quick Links

- **TestNet Explorer:** https://testnet.algoexplorer.io
- **USDC Faucet:** https://faucet.circle.com
- **ALGO Faucet:** https://lora.algokit.io/testnet/fund
- **Facilitator:** https://facilitator.goplausible.xyz

---

## 💪 Pro Tips

1. **Start simple** - Get basic flow working first
2. **Copy patterns** - Use Weather.tsx as template
3. **Test early** - Don't wait until end
4. **Use AI** - ChatGPT/Copilot allowed
5. **Ask for help** - AlgoBharat team available
6. **Focus on demo** - Working demo > perfect code
7. **Prepare backup** - Record successful test
8. **Know your hash** - Save transaction ID

---

## 🏆 Winning Strategy

**Technical Excellence:**
- Clean code structure
- Proper TypeScript types
- Good error handling
- Fast response time

**Creativity:**
- Unique use case
- Solves real problem
- Interesting service

**Execution:**
- Works flawlessly
- Clear demo
- Confident pitch

---

**Now go build something awesome! ⚡**

*Remember: 55 minutes. One endpoint. Make it work. Make it interesting.*

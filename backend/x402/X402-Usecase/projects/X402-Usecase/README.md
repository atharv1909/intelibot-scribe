# x402 Weather API Demo - Algorand Testnet

A complete, end-to-end demonstration of the **x402 Payment Protocol** on Algorand. This demo shows how to build a **pay-per-API service** using HTTP 402 Payment Required with USDC payments on Algorand TestNet.

## What You'll Learn

- Connect an Algorand wallet in a React app
- Request a protected resource that requires payment
- Sign an x402 payment transaction
- Have a facilitator verify and settle your payment on-chain
- Receive the protected resource (weather JSON)

**All in one browser-based demo.**

---

## Quick Start (Hosted Facilitator)

### Prerequisites

1. **Node.js 20+** and **npm 9+**
2. **Two Algorand TestNet accounts** (one for you, one for the server)
3. **TestNet USDC** (get free USDC from [Circle Faucet](https://faucet.circle.com/))
4. **Algorand wallet** (Pera, Defly, or Lute browser wallet)

**Setup guide:** See "Prerequisites" section below for detailed account setup.

### Run the Demo (5 minutes)

```bash
# Step 1: Frontend
cd /Users/maroti/Algorand\\ Dev/X402/X402-Usecase/projects/X402-Usecase
cp .env.template .env
# Edit .env: uncomment TestNet section
npm install
npm run dev
# Opens at http://localhost:5173

# Step 2: Server (new terminal)
cd /Users/maroti/Algorand\\ Dev/X402/x402-demo-server
cat > .env << EOF
AVM_ADDRESS=YOUR_SERVER_ADDRESS
FACILITATOR_URL=https://facilitator.goplausible.xyz
PORT=4021
EOF
npm install
npm run start
# Should see: "x402 Resource Server listening at http://localhost:4021"

# Step 3: In the browser
# 1. Click "Connect Wallet"
# 2. Click "Request Weather (Pay 0.005 USDC)"
# 3. Sign payment in your wallet
# 4. See weather JSON appear
```

---

## Prerequisites

### 1. Node.js & npm

Install from [nodejs.org](https://nodejs.org/). Verify:

```bash
node -v  # 20.0 or later
npm -v   # 9.0 or later
```

### 2. Algorand TestNet Accounts

Create two accounts (or use existing ones):

**Option A: Using AlgoKit CLI**
```bash
algokit generate account --fundable
# Saves mnemonic to a file
```

**Option B: Using any Algorand wallet** (Pera, Defly, etc.)
- Create a new account
- Note the 25-word mnemonic (save securely, never commit to Git)

**Fund each account with TestNet ALGO:**
1. Visit [Lora Faucet](https://lora.algokit.io/testnet/fund)
2. Enter account address
3. Fund with TestNet ALGO (minimum 1 ALGO each)

### 3. TestNet USDC (ASA 10458941)

**Step 1: Opt-in to USDC**

Visit [Lora TestNet](https://lora.algokit.io/testnet/) or use your wallet app:
- Select "Opt In to Asset"
- Search for USDC (ASA ID: `10458941`)
- Confirm for both your personal account and server account

**Step 2: Get USDC from Circle Faucet**

1. Visit [Circle Testnet Faucet](https://faucet.circle.com/)
2. Select "Algorand Testnet"
3. Enter account address
4. Receive 100 USDC tokens

**Verify USDC balance:**
- Open your Algorand wallet app
- Navigate to "Assets"
- Should see "USDC" with balance

### 4. Install Algorand Wallet

Download one of these wallets:
- **Pera Wallet:** [iOS](https://apps.apple.com/us/app/pera-algo-wallet/id1459898525), [Android](https://play.google.com/store/apps/details?id=com.algorand)
- **Defly Wallet:** [iOS](https://apps.apple.com/us/app/defly-wallet/id1664707218), [Android](https://play.google.com/store/apps/details?id=defly.app)
- **Lute Wallet:** [Chrome Extension](https://chromewebstore.google.com/detail/lute-algorand-wallet/mfpmefmmjdmphpbbjnfbcdncjhalkid)

---

## Testing

### Test 1: Successful Payment

**Requirements:**
- Wallet connected
- USDC balance ≥ 0.005
- Server running at localhost:4021

**Steps:**
1. Click "Request Weather"
2. Sign payment in wallet
3. See JSON appear in ~2-5 seconds

### Test 2: Insufficient Balance

**Setup:** Connect wallet with < 0.005 USDC

**Expected:** Error message "Payment failed"

### Test 3: Wallet Not Connected

**Steps:** Click "Request Weather" without connecting

**Expected:** Error "Please connect your wallet first"

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Wallet not connected" | Click "Connect Wallet" and approve in app |
| "Insufficient balance" | Get more USDC from Circle Faucet |
| "Server connection error" | Check server is running at localhost:4021 |
| "CORS error" | Restart server (CORS headers should auto-enable) |
| "Facilitator error" | Check https://facilitator.goplausible.xyz/supported |
| "Opt-in required" | Visit Lora TestNet and opt-in to USDC (ASA 10458941) |

---

## Architecture

```
Browser (React)
    ↓ [HTTP 402 + signature]
Hono Server (localhost:4021)
    ↓ [Verify + settle]
x402 Facilitator (hosted)
    ↓ [Sign & submit]
Algorand TestNet
```

### Files

**Frontend:**
- [src/components/Weather.tsx](./src/components/Weather.tsx) - Payment UI
- [src/utils/weatherApi.ts](./src/utils/weatherApi.ts) - x402 fetch wrapper
- [.env.template](./.env.template) - Configuration

**Server:**
- [../../../x402-demo-server/index.ts](../../../x402-demo-server/index.ts) - Hono app with x402 middleware
- [../../../x402-demo-server/.env.example](../../../x402-demo-server/.env.example) - Server config

---

## Advanced: Self-Hosted Facilitator

For production or to understand payment verification, run your own facilitator:

```bash
# 1. Create facilitator account (same as Step 2 above)
# 2. Start facilitator
cd /Users/maroti/Algorand\\ Dev/X402/facilitator/basic
cat > .env << EOF
AVM_MNEMONIC=your-facilitator-mnemonic
PORT=4022
EOF
npm install
npm run start

# 3. Update server to point to local facilitator
cd /Users/maroti/Algorand\\ Dev/X402/x402-demo-server
# Edit .env: change FACILITATOR_URL=http://localhost:4022
npm run start

# 4. Run frontend (same as before)
# Flow now: Browser → Server → Local Facilitator → TestNet
```

---

## Resources

- **x402 Spec:** https://github.com/coinbase/x402
- **Algorand Dev Docs:** https://dev.algorand.co/resources/x402-on-algorand/
- **GoPlausible Facilitator:** https://facilitator.goplausible.xyz/docs
- **SDK Reference:** @x402-avm/fetch, @x402-avm/avm, @x402-avm/core

---

## FAQ

**Q: Do I need to store keys in code?**  
A: No. This demo uses browser wallets (Pera, Defly, Lute) which handle signing securely. Only CLI examples use mnemonics for testing.

**Q: What if I don't have TestNet USDC?**  
A: Get free USDC from [Circle Testnet Faucet](https://faucet.circle.com/).

**Q: Can I use MainNet?**  
A: Yes, but TestNet is safer. Change `VITE_ALGOD_NETWORK=mainnet` in `.env` (real USDC will be spent).

**Q: How much does a request cost?**  
A: 0.005 USDC + minimal ALGO transaction fees (TestNet tokens are free).

---

## Next Steps

1. Modify the pricing: Change `$0.005` in [x402-demo-server/index.ts](../../../x402-demo-server/index.ts)
2. Add more endpoints: Create `/news`, `/sports`, etc.
3. Use a real API: Replace mock weather with OpenWeatherMap, etc.
4. Deploy to production: Use the self-hosted facilitator and MainNet

---

**Happy building! 🚀**

# X402 Meme Generator - Developer Quick Reference

## 🚀 5-Minute Quick Start

```bash
# 1. Setup (run once)
./setup-meme-generator.sh

# 2. Configure (edit these)
vim x402-demo-server/.env
# Add: HUGGINGFACE_API_KEY=hf_xxx
# Add: AVM_ADDRESS=YOUR_ALGO_ADDRESS

# 3. Start server (terminal 1)
cd x402-demo-server && npm start

# 4. Start frontend (terminal 2)
cd X402-Usecase/projects/X402-Usecase && npm run dev

# 5. Open browser
open http://localhost:5173
```

## 📡 API Endpoints Quick Reference

| Endpoint | Method | Payment | Price | Description |
|----------|--------|---------|-------|-------------|
| `/meme-generate` | POST | ✅ Required | $0.1 USDC | Generate AI meme |
| `/meme-styles` | GET | ❌ Free | - | Get available styles |
| `/health` | GET | ❌ Free | - | Server health check |
| `/info` | GET | ❌ Free | - | Server information |

## 🔧 Environment Variables

### Server (.env)
```bash
AVM_ADDRESS=<your-algorand-address>
FACILITATOR_URL=https://facilitator.goplausible.xyz
HUGGINGFACE_API_KEY=hf_<your-key>
HF_MODEL=black-forest-labs/FLUX.1-schnell  # optional
PORT=4021  # optional
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:4021
VITE_APP_MODE=meme  # or 'weather' for original demo
VITE_ALGOD_NETWORK=testnet
```

## 📝 Request/Response Examples

### Generate Meme Request
```bash
curl -X POST http://localhost:4021/meme-generate \
  -H "Content-Type: application/json" \
  -H "Payment-Signature: <signature-from-x402>" \
  -d '{
    "prompt": "When you finally fix that bug at 3 AM",
    "style": "drake",
    "theme": "tech"
  }'
```

### Response (Success)
```json
{
  "success": true,
  "meme": {
    "imageUrl": "data:image/png;base64,iVBORw0KG...",
    "prompt": "When you finally fix that bug at 3 AM",
    "enhancedPrompt": "Make a technology or programming related...",
    "style": "drake",
    "theme": "tech",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "paymentReceived": "0.1 USDC",
    "model": "black-forest-labs/FLUX.1-schnell",
    "ragEnhanced": true
  }
}
```

### Response (Error - No Payment)
```json
{
  "statusCode": 402,
  "message": "Payment Required",
  "accepts": [{
    "scheme": "exact",
    "price": "$0.1",
    "network": "eip155:416002",
    "payTo": "YOUR_ADDRESS",
    "extra": { "asset": 10458941 }
  }]
}
```

## 🎨 Available Options

### Meme Styles
```typescript
'drake', 'distracted-boyfriend', 'expanding-brain', 
'womanyelling-cat', 'stonks', 'doge'
```

### Themes
```typescript
'funny', 'crypto', 'tech', 'trending'
```

### Supported AI Models
```typescript
'black-forest-labs/FLUX.1-schnell'          // Fast (default)
'stabilityai/stable-diffusion-xl-base-1.0'  // High quality
'runwayml/stable-diffusion-v1-5'            // Classic
'stabilityai/stable-diffusion-2-1'          // Updated
```

## 🔑 Key Files Reference

| File | Purpose | Modify to... |
|------|---------|--------------|
| `handlers/meme-generator.ts` | Main handler | Add RAG logic, change AI provider |
| `endpoints.config.ts` | Payment config | Change pricing, add endpoints |
| `index.ts` (server) | Route registration | Add new routes |
| `MemeGenerator.tsx` | UI component | Change UI, add features |
| `memeApi.ts` | API client | Modify payment flow |
| `.env` | Configuration | Set API keys, addresses |

## 🧪 Testing Commands

### Test Server Health
```bash
curl http://localhost:4021/health
```

### Test Styles Endpoint (Free)
```bash
curl http://localhost:4021/meme-styles
```

### Test Generate (Will fail - needs payment)
```bash
curl -X POST http://localhost:4021/meme-generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

### Check Server Info
```bash
curl http://localhost:4021/info
```

## 💡 Common Customizations

### Change Price
```typescript
// endpoints.config.ts
price: '$0.05'  // Change from 0.1 to 0.05 USDC
```

### Add Custom Style
```typescript
// handlers/meme-generator.ts
const MEME_CONTEXT = {
  styles: [...existing, 'my-custom-style'],
  // ...
}
```

### Change AI Model
```bash
# .env
HF_MODEL=stabilityai/stable-diffusion-xl-base-1.0
```

### Add Custom Theme
```typescript
// handlers/meme-generator.ts
templates: {
  'gaming': 'Create a gaming-related meme',
  // ...
}
```

## 🐛 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "HUGGINGFACE_API_KEY not configured" | Add key to `.env` and restart server |
| "Payment fails" | Check wallet has USDC on TestNet |
| "Model loading" (first request slow) | Wait 20-30s, subsequent requests faster |
| "CORS error" | Server should have wildcard CORS enabled |
| "Transaction signing fails" | Ensure wallet is connected to TestNet |
| "Port 4021 in use" | Change PORT in `.env` |
| "Frontend won't load" | Check VITE_API_BASE_URL in frontend `.env` |

## 📊 Performance Metrics

| Metric | Expected Value |
|--------|----------------|
| Payment processing | 2-3 seconds |
| RAG enhancement | < 100ms |
| Image generation | 2-5 seconds |
| Total response time | 5-8 seconds |
| Cost per request | 0.1 USDC |

## 🔒 Security Checklist

- ✅ Hugging Face API key in server `.env` only
- ✅ Payment verified on-chain before generation
- ✅ No image generation without payment
- ✅ CORS configured for x402 headers
- ✅ Environment variables not committed to git
- ✅ Rate limiting via payment cost

## 📞 Get Help

1. **README**: `MEME_GENERATOR_README.md` - Full setup guide
2. **Architecture**: `MEME_GENERATOR_ARCHITECTURE.md` - Technical details
3. **UI Guide**: `MEME_GENERATOR_UI_GUIDE.md` - Frontend specs
4. **Summary**: `IMPLEMENTATION_SUMMARY.md` - What was built

## 🎯 Quick Test Checklist

```
□ Server starts without errors
□ Frontend loads at localhost:5173
□ /health endpoint returns 200
□ /meme-styles returns styles list
□ Wallet connects successfully
□ Generate button enabled after connection
□ Payment transaction prompts
□ Transaction signs successfully
□ Loading state shows during generation
□ Image displays after generation
□ Download button works
□ Can generate multiple memes
```

## 💰 Pricing Calculations

```
USDC has 6 decimals on Algorand

$0.1 USDC = 100,000 micro-units
$0.05 USDC = 50,000 micro-units
$0.01 USDC = 10,000 micro-units
$0.005 USDC = 5,000 micro-units
$0.001 USDC = 1,000 micro-units

Format in code: "$0.1" (string)
```

## 🔄 Payment Flow Summary

```
1. User clicks "Generate"
2. Frontend: POST /meme-generate (no signature)
3. Server: Returns 402 + payment terms
4. x402 Client: Creates payment transaction
5. Wallet: User signs transaction
6. Facilitator: Submits to blockchain
7. x402 Client: Retries with Payment-Signature header
8. Server: Validates signature
9. Handler: Generates meme
10. Response: Returns image
11. Frontend: Displays meme
```

## 📚 Essential Links

| Resource | URL |
|----------|-----|
| Hugging Face Tokens | https://huggingface.co/settings/tokens |
| Algorand TestNet Faucet | https://bank.testnet.algorand.network/ |
| x402 Docs | https://algorand.co/agentic-commerce/x402 |
| FLUX Model | https://huggingface.co/black-forest-labs/FLUX.1-schnell |
| Local Server | http://localhost:4021 |
| Local Frontend | http://localhost:5173 |

## 🎨 RAG Enhancement Formula

```
Enhanced = ThemeContext + StyleHint + UserPrompt + QualityRules

Example:
Input: "debugging at 3am"
Theme: "tech"
Style: "drake"

Output: "Make a technology or programming related meme 
in the style of drake meme format. Meme idea: debugging 
at 3am. Keep text short and punchy. Use bold, readable 
fonts. Ensure high contrast for text visibility. Follow 
classic meme formats. Make it shareable and relatable. 
Generate a funny, shareable meme image."
```

## 🚀 Next Steps

After basic setup:
1. Generate your first meme
2. Try different styles and themes
3. Experiment with prompts
4. Modify RAG context
5. Change AI model
6. Adjust pricing
7. Add custom features

---

**Keep this reference handy while developing!**

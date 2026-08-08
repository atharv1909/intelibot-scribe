# x402 Build & Arena - Technical Judging Criteria (Final)

## 🎯 CLEAR TECHNICAL PARAMETERS FOR JUDGING

This document provides **objective, measurable technical criteria** for judges to evaluate projects. No subjective parameters like "usability" or "scalability" - only technical verification.

---

## ✅ MANDATORY REQUIREMENTS (Pass/Fail)

Before scoring, verify these **5 mandatory items**. If any fail, maximum score = 50/100.

### 1. Payment Transaction Exists ✓
**Verification:**
```
□ Team provides transaction hash
□ Visit: https://testnet.algoexplorer.io/tx/[HASH]
□ Transaction shows USDC transfer (ASA 10458941)
□ Transaction is confirmed (not pending)
```

### 2. x402 SDK Used ✓
**Verification:**
```
□ Check imports in code:
   import { x402Client, wrapFetchWithPayment } from '@x402-avm/fetch'
□ No manual payment handling
□ Uses SDK's automatic 402 challenge/response
```

### 3. Service Returns Data ✓
**Verification:**
```
□ Click payment button
□ Sign transaction
□ Response appears in UI within 10 seconds
□ Response is valid JSON or structured data
```

### 4. TestNet Network ✓
**Verification:**
```
□ Check .env file: VITE_ALGOD_NETWORK=testnet
□ Transaction on testnet.algoexplorer.io (not mainnet)
□ No MainNet references in code
```

### 5. Code Compiles/Runs ✓
**Verification:**
```
□ No TypeScript compilation errors
□ Server starts without errors
□ Frontend loads without crashes
```

---

## 📊 TECHNICAL SCORING (100 Points)

### Category 1: x402 Protocol Implementation (30 points)

#### 1A. Payment Flow Completeness (10 points)
**Objective Criteria:**
- [ ] User clicks → wallet prompts (2 pts)
- [ ] Transaction signs successfully (3 pts)
- [ ] Payment settles on-chain (3 pts)
- [ ] Response delivered automatically (2 pts)

**Measurement:**
```
Test: Click payment button, count steps that work
10 pts: All 4 steps work
7 pts: 3 steps work
4 pts: 2 steps work
0 pts: 0-1 steps work
```

---

#### 1B. SDK Integration Correctness (10 points)
**Objective Criteria:**
- [ ] Uses `@x402-avm/fetch` wrapper (3 pts)
- [ ] Implements ClientAvmSigner interface (3 pts)
- [ ] Handles 402 response automatically (2 pts)
- [ ] No manual payment logic (2 pts)

**Code Check:**
```typescript
// Must have:
import { x402Client, wrapFetchWithPayment } from '@x402-avm/fetch'
const client = new x402Client()
const fetchFn = await wrapFetchWithPayment(fetch, client)

// Must NOT have:
// Manual transaction building
// Manual facilitator calls
// Custom payment handling
```

**Measurement:**
```
10 pts: Perfect SDK usage, follows pattern
7 pts: SDK used, minor deviations
4 pts: SDK used but with workarounds
0 pts: No SDK or manual implementation
```

---

#### 1C. On-Chain Verification (10 points)
**Objective Criteria:**
- [ ] Transaction hash provided (2 pts)
- [ ] Transaction confirmed on TestNet (3 pts)
- [ ] Correct USDC amount (0.005) (3 pts)
- [ ] Correct asset ID (10458941) (2 pts)

**Measurement:**
```
Visit: https://testnet.algoexplorer.io/tx/[HASH]

Check:
- Status: Confirmed ✓
- Asset: USDC (10458941) ✓
- Amount: 0.005 USDC ✓
- Network: TestNet ✓

10 pts: All verified
7 pts: 3/4 verified
4 pts: 2/4 verified
0 pts: 0-1 verified
```

---

### Category 2: Code Quality & Architecture (25 points)

#### 2A. Code Structure (8 points)
**Objective Criteria:**
- [ ] Backend endpoint in separate file (2 pts)
- [ ] Frontend component in separate file (2 pts)
- [ ] Payment logic isolated from business logic (2 pts)
- [ ] No code duplication (2 pts)

**Measurement:**
```
Check file structure:
/server/
  ├── index.ts (routes)
  └── services/yourService.ts (logic)
/frontend/
  ├── components/YourService.tsx
  └── utils/weatherApi.ts (reused)

8 pts: Clean separation, no duplication
6 pts: Mostly separated, minor coupling
3 pts: Some separation, significant coupling
0 pts: Monolithic, no separation
```

---

#### 2B. Error Handling (8 points)
**Objective Criteria:**
- [ ] Wallet not connected → error message (2 pts)
- [ ] Insufficient balance → error message (2 pts)
- [ ] Network failure → error message (2 pts)
- [ ] Try-catch blocks present (2 pts)

**Test Cases:**
```
Test 1: Disconnect wallet, click payment
Expected: "Please connect your wallet first"

Test 2: Connect wallet with 0 USDC, click payment
Expected: "Insufficient balance" or similar

Test 3: Stop server, click payment
Expected: "Network error" or similar

8 pts: All 3 tests pass + try-catch present
6 pts: 2 tests pass
3 pts: 1 test passes
0 pts: No error handling
```

---



**Code Check:**
```typescript
// Good (9 pts):
interface WeatherResponse {
  temperature: number
  condition: string
}

const YourService: React.FC = () => {
  const [data, setData] = useState<WeatherResponse | null>(null)
}

// Bad (0 pts):
const YourService = () => {
  const [data, setData] = useState<any>(null)
}
```

**Measurement:**
```
Count `any` types in code:
0-2 occurrences: 9 pts
3-5 occurrences: 6 pts
6-10 occurrences: 3 pts
>10 occurrences: 0 pts
```

---

### Category 3: Technical Creativity (20 points)

#### 3A. Service Originality (10 points)
**Objective Criteria:**
- [ ] Different endpoint than weather (2 pts)
- [ ] Different data structure (2 pts)
- [ ] Different service logic (3 pts)
- [ ] Solves a use case (3 pts)

**Comparison Test:**
```
Weather example:
- Endpoint: /weather
- Returns: { temperature, condition, location }
- Logic: Mock data

Your service:
- Endpoint: /[different] ✓
- Returns: [different structure] ✓
- Logic: [different implementation] ✓

10 pts: Completely different service
7 pts: Variation of weather (different city/API)
4 pts: Minor changes to weather example
0 pts: Copy of weather example
```

---

#### 3B. Technical Implementation Complexity (10 points)
**Objective Criteria:**
- [ ] External API integration (4 pts)
- [ ] Data transformation/processing (3 pts)
- [ ] Algorithm implementation (3 pts)

**Complexity Levels:**
```
Level 1 (0-3 pts): Static data
- Returns hardcoded JSON
- No processing
- Example: Random quote from array

Level 2 (4-6 pts): Simple processing
- Basic calculations
- String manipulation
- Example: Hash generator, timestamp converter

Level 3 (7-10 pts): Advanced
- External API calls
- Complex algorithms
- Data aggregation
- Example: News API, crypto prices, QR generator
```

**Measurement:**
```
Check code for:
- fetch() to external API: +4 pts
- Data transformation (map/filter/reduce): +3 pts
- Algorithm (sorting, hashing, etc.): +3 pts

10 pts: All three present
7 pts: Two present
4 pts: One present
0 pts: None present
```

---

### Category 4: Functionality & Completeness (15 points)

#### 4A. Service Correctness (8 points)
**Objective Criteria:**
- [ ] Returns valid data format (2 pts)
- [ ] Data is correct/meaningful (3 pts)
- [ ] Response time < 5 seconds (3 pts)

**Test:**
```
1. Make payment
2. Start timer
3. Check response

Verify:
- Valid JSON: ✓
- Data makes sense: ✓
- Time < 5 sec: ✓

8 pts: All pass
6 pts: 2/3 pass
3 pts: 1/3 pass
0 pts: 0/3 pass
```

---

#### 4B. UI State Management (7 points)
**Objective Criteria:**
- [ ] Loading state shown during payment (2 pts)
- [ ] Success message after payment (2 pts)
- [ ] Error message on failure (2 pts)
- [ ] Button disabled during loading (1 pt)

**Test:**
```
1. Click payment button
   Expected: Button shows "Processing..." or spinner

2. Payment succeeds
   Expected: Success message appears

3. Disconnect wallet, click button
   Expected: Error message appears

4. During payment
   Expected: Button is disabled

7 pts: All 4 states work
5 pts: 3 states work
2 pts: 2 states work
0 pts: 0-1 states work
```

---

### Category 5: Algorand-Specific Features (10 points)

#### 5A. USDC Asset Configuration (5 points)
**Objective Criteria:**
- [ ] Uses ASA ID 10458941 (3 pts)
- [ ] Correct amount (0.005 USDC) (2 pts)

**Verification:**
```
Check transaction on AlgoExplorer:
- Asset Transfer: USDC (10458941) ✓
- Amount: 0.005 ✓

5 pts: Both correct
3 pts: Correct asset, wrong amount
0 pts: Wrong asset or no USDC
```

---

#### 5B. Network Configuration (5 points)
**Objective Criteria:**
- [ ] Uses TestNet algod (2 pts)
- [ ] Correct network in .env (2 pts)
- [ ] No MainNet references (1 pt)

**Code Check:**
```
.env file:
VITE_ALGOD_NETWORK=testnet ✓
VITE_ALGOD_TOKEN=... ✓
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud ✓

Code:
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm' ✓

5 pts: All TestNet
3 pts: Mostly TestNet, minor issues
0 pts: MainNet or mixed
```

---

## 🧮 SCORING SUMMARY

| Category | Points | Verification Method |
|----------|--------|---------------------|
| 1. x402 Protocol | 30 | Transaction hash + code review |
| 2. Code Quality | 25 | Code structure + error tests |
| 3. Creativity | 20 | Service comparison + complexity |
| 4. Functionality | 15 | Live demo + timing |
| 5. Algorand Features | 10 | AlgoExplorer + .env check |
| **TOTAL** | **100** | |

---

## ⚡ QUICK JUDGE CHECKLIST (3 Minutes)

**During Presentation (2 min):**
```
□ Watch demo: Does payment work? (Y/N)
□ See response: Is data valid? (Y/N)
□ Check time: Response < 5 sec? (Y/N)
□ Note: What service is it? ___________
```

**After Presentation (1 min):**
```
□ Get transaction hash: _______________
□ Verify on AlgoExplorer (scan QR or type)
□ Check code structure (quick glance)
□ Complete scorecard
```

**Scoring Time (5 min):**
```
□ Fill in all 5 categories
□ Calculate total: ___/100
□ Write brief notes
□ Submit scorecard
```

---

## 🎯 TIEBREAKER RULES (Objective)

If two teams have same final score:

### 1st Tiebreaker: x402 Implementation Score
```
Compare Category 1 scores
Higher score wins
```

### 2nd Tiebreaker: Technical Creativity Score
```
Compare Category 3 scores
Higher score wins
```

### 3rd Tiebreaker: Response Time
```
Measure time from click to response
Faster wins
```

### 4th Tiebreaker: Code Lines
```
Count lines of new code (excluding comments)
More lines wins (shows more work)
```

---

## 📊 SCORE INTERPRETATION

### 90-100 Points: Exceptional
- Flawless x402 implementation
- Production-ready code quality
- Highly creative service
- Perfect functionality
- Could deploy to MainNet

### 75-89 Points: Excellent
- Strong x402 implementation
- Good code structure
- Creative service
- Works reliably
- Minor improvements needed

### 60-74 Points: Good
- Working x402 implementation
- Acceptable code quality
- Decent service idea
- Mostly functional
- Several improvements needed

### 45-59 Points: Fair
- Basic x402 implementation
- Code needs work
- Simple service
- Some functionality issues
- Significant improvements needed

### Below 45 Points: Needs Improvement
- Incomplete x402 implementation
- Poor code quality
- Minimal creativity
- Functionality issues
- Major rework required

---

## 🔍 JUDGE CALIBRATION

Before judging starts, all judges review this example:

### Example Team: "Dad Joke API"
**Service:** Returns random dad joke for 0.005 USDC

**Scoring:**
```
1. x402 Protocol (30 pts)
   - Payment works: 10/10
   - SDK used correctly: 10/10
   - On-chain verified: 10/10
   Subtotal: 30/30

2. Code Quality (25 pts)
   - Structure: 8/8 (clean separation)
   - Error handling: 6/8 (missing balance check)
   - TypeScript: 7/9 (2 `any` types)
   Subtotal: 21/25

3. Creativity (20 pts)
   - Originality: 7/10 (simple but different)
   - Complexity: 2/10 (static array)
   Subtotal: 9/20

4. Functionality (15 pts)
   - Correctness: 8/8 (works perfectly)
   - UI states: 7/7 (all states present)
   Subtotal: 15/15

5. Algorand (10 pts)
   - USDC: 5/5 (correct)
   - Network: 5/5 (TestNet)
   Subtotal: 10/10

TOTAL: 85/100 (Excellent)
```

All judges should score this example within ±5 points.

---

## ✅ FINAL CHECKLIST FOR JUDGES

Before submitting scorecard:

```
□ All 5 categories scored
□ Total calculated correctly
□ Transaction hash verified
□ Notes written
□ Name and signature added
□ Scorecard submitted to organizer
```

---

**This judging system is:**
- ✅ Objective (measurable criteria)
- ✅ Technical (no subjective parameters)
- ✅ Fair (same criteria for all teams)
- ✅ Fast (3 min presentation + 5 min scoring)
- ✅ Transparent (clear point allocation)

**Ready to judge! 🏆**

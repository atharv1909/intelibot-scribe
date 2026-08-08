# 🎯 Facilitator's Checklist - x402 Hackathon

> **Prepare and distribute starter kit to teams**

## Pre-Event Setup (Facilitator)

- [ ] Clone starter kit repo
- [ ] Verify all files are present
  - [ ] Backend: `x402-demo-server/`
  - [ ] Frontend: `X402-Usecase/projects/X402-Usecase/`
  - [ ] Docs: All `.md` files present
- [ ] Run `npm install` in both directories (optional, teams can do it)
- [ ] Test backend: `npm start` → check `http://localhost:4021/health`
- [ ] Test frontend: `npm run dev` → check `http://localhost:5173`
- [ ] Create `.env` template for teams
- [ ] Print physical copies of key docs
- [ ] Set up projector for demos
- [ ] Test internet connection (for blockchain)

## Team On-Boarding (0-5 min)

**Hand each team:**
- [ ] Starter kit (repo or ZIP file)
- [ ] Physical copy of **README_HACKATHON.md**
- [ ] Physical copy of **HACKATHON_STARTER_KIT.md**
- [ ] `.env.example` template
- [ ] WiFi password
- [ ] Slack channel link

**Quick intro (3 min):**
- [ ] What is x402? (payment protocol for APIs)
- [ ] The goal: Build at least 2 monetized endpoints and get them verified
- [ ] Examples: Weather, Analytics, AI, Creator content
- [ ] Requirement: Get Green Card verification for each endpoint before presenting
- [ ] Judged on: Business value, novelty, abstraction quality, implementation depth, presentation clarity, and code quality
- [ ] Winners: [Prizes TBD]

## Team Quick Start (5-10 min)

**Check each team has:**
- [ ] Nodes.js 18+ installed
- [ ] Algorand TestNet wallet (Pera or Defly)
- [ ] 0.01+ USDC on TestNet

**Help them:**
- [ ] Clone/extract starter kit
- [ ] Run `npm install` (both directories)
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in wallet address
- [ ] Start backend: `npm start`
- [ ] Start frontend: `npm run dev`
- [ ] Verify http://localhost:4021/health returns `{"status":"ok"}`

**Expected output:**
```
✅ x402 Resource Server is running!
(with API, Health, Info endpoints listed)
```

## During Hackathon (55 minutes)

**Roaming checklist - help teams with:**

At T=10:
- [ ] Have you picked an idea?
- [ ] Have you read endpoints.config.ts?
- [ ] Do you understand the handler pattern?

At T=25:
- [ ] Have you defined your endpoint in config?
- [ ] Have you created your handler file?
- [ ] Did you register it in index.ts?
- [ ] Can you test with curl?

At T=40:
- [ ] Is your endpoint returning data?
- [ ] Can you test in browser?
- [ ] Does payment flow work?

At T=50:
- [ ] Does everything work?
- [ ] Error messages clear?
- [ ] Ready to demo?

## Troubleshooting During Event

### Common Issue: "Port in use"
```bash
lsof -ti:4021 | xargs kill -9
npm start
```

### Common Issue: "npm install fails"
- Check internet
- Try `npm cache clean --force`
- Try different terminal

### Common Issue: "402 always returns"
- Wallet not connected?
- No USDC on TestNet?
- Wrong AVM_ADDRESS in .env?

### Common Issue: "CORS error"
- Restart backend
- Check CORS middleware in index.ts

### Common Issue: "Can't import handler"
- Check file path matches import
- Check `export function`

## Pitches & Demos (Last 5 min per team)

### 2-Minute Pitch
Judge if teams explain:
- [ ] Problem their API solves
- [ ] How x402 improves it
- [ ] Who is the customer
- [ ] Why it's creative/cool

### 1-Minute Demo
Check:
- [ ] Wallet connected
- [ ] Payment request works
- [ ] Wallet popup appears
- [ ] Data returns to browser
- [ ] No major errors

### Scoring Rubric

**x402 Usage (25%):**
- [ ] 25: Properly implements x402 payment flow
- [ ] 20: Mostly correct, minor issues
- [ ] 15: Payment works but incomplete
- [ ] 10: Attempted but has issues
- [ ] 5: Minimal x402 integration
- [ ] 0: No x402

**Simplicity (15%):**
- [ ] 15: Clean, easy-to-understand code
- [ ] 12: Pretty clean
- [ ] 9: Functional but messy
- [ ] 6: Hard to follow
- [ ] 3: Very confusing
- [ ] 0: Incomprehensible

**Creativity (25%):**
- [ ] 25: Novel, original idea
- [ ] 20: Good twist on existing
- [ ] 15: Interesting combination
- [ ] 10: Basic idea, executed well
- [ ] 5: Minimal creativity
- [ ] 0: Just copied example

**Usability (20%):**
- [ ] 20: Great UX, works smoothly
- [ ] 16: Good UX, minor issues
- [ ] 12: Functional, okay UX
- [ ] 8: Works but clunky
- [ ] 4: Has bugs
- [ ] 0: Broken

**Presentation (15%):**
- [ ] 15: Clear pitch, great demo
- [ ] 12: Good pitch, good demo
- [ ] 9: Okay pitch, okay demo
- [ ] 6: Unclear pitch or demo issues
- [ ] 3: Hard to follow
- [ ] 0: Didn't present

**Total: 100 points**

## Documentation Tour (Optional - 5 min)

Point teams to:
- [ ] **README_HACKATHON.md** - Overview
- [ ] **HACKATHON_STARTER_KIT.md** - Detailed guide
- [ ] **x402-demo-server/HACKATHON_README.md** - Backend specific
- [ ] **handlers/** - Copy/modify examples
- [ ] **endpoints.config.ts** - Define your routes
- [ ] **X402_CRITICAL_REFERENCE.md** - Code lookup
- [ ] **X402_IMPLEMENTATION_GUIDE.md** - Deep dive

## Estimated Schedule (60 min total)

```
0:00  Event starts
0:05  Hand out starter kit + intro (5 min)
0:10  Teams start setup (5 min)
0:15  Teams pick ideas + start coding (40 min)
0:55  Teams wrap up (5 min)
1:00  Pitches start (2 min each)
1:02  Demos (1 min each)
1:03  Judging (2 min)
1:05  Results announced
```

## Post-Event

- [ ] Collect feedback from teams
- [ ] Take photos of winning pitches
- [ ] Share starter kit for future use
- [ ] Update docs based on feedback
- [ ] Award prizes
- [ ] Celebrate! 🎉

## Tips for Success

1. **Keep it simple** - This is about fast iteration, not perfection
2. **Celebrate effort** - Everyone who finishes gets applause
3. **Help liberally** - Better to help than have stuck teams
4. **Encourage creativity** - Bonus points for novel ideas
5. **Document stories** - Photos, quotes, reactions
6. **Make it fun** - Play music, keep energy high
7. **End strong** - Good closing remarks and networking
8. **Plan next one** - Make it a monthly/quarterly thing

## Starter Kit Features

Remind teams that starter kit includes:

✅ Working backend (Hono)
✅ Working frontend (React)
✅ 4 example handlers
✅ Modular design
✅ Full documentation
✅ Type-safe code
✅ CORS configured
✅ Error handling
✅ Logging
✅ Copy-paste templates

**Everything needed to win!**

## Resources Available to Share

- **Local:** All docs in repo (markdown)
- **Online:** (If internet available)
  - x402.money - Official spec
  - developer.algorand.org - Algorand docs
  - discord.gg/algorand - Community

## Contact Info

**In case of issues:**
- [ ] Facilitator phone number: _______________
- [ ] Slack channel: _______________
- [ ] Discord: _______________
- [ ] Email: _______________

---

**Questions? Check HACKATHON_STARTER_KIT.md Troubleshooting section.**

**Good luck hosting! 🚀**

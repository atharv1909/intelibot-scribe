# Concept Note: x402 Build Sprint on Algobharat Dev Retreat

**Event Date:** Saturday, 13 June 2026  
**Duration:**  4 Hours  
**Format:** Internal Team Sync

---

## 1. Overview

The x402 Build Sprint is a focused and competitive hackathon session embedded within the Algobharat Dev Retreat. It brings together approximately ~60 participants drawn from 30 project teams and reorganises them into 10 freshly composed teams of 6. The session is designed to be energetic and collaborative. It is grounded in real business problem solving. The central theme is x402 as the foundational protocol for agentic commerce on Algorand. This protocol is made accessible through goPlausible x402 endpoints on the Algorand blockchain.

The event challenges teams to move beyond simple demos and prototypes. Each team is expected to identify a genuine business problem. They must design a solution that uses x402 powered agents working silently in the background. They must deliver a working and user facing product experience within a single afternoon.

---

## 2. The x402 Philosophy

x402 is the future of agentic commerce. It enables autonomous agents to transact on behalf of users. These agents can request payments and unlock services programmatically without requiring the user to understand the underlying infrastructure. goPlausible exposes x402 compliant endpoints on Algorand. This allows developers to build agent driven workflows.

Each step in a process can independently call an endpoint and receive a result. It can then trigger a USDC payment request when value is delivered.

The key design principle for this competition is abstraction. Users should experience a clean and intuitive interface where they simply describe a job they want done. Behind the scenes multiple x402 agents coordinate. Each agent calls a distinct endpoint and aggregates results. The system surfaces a payment request only when the user is ready to act. The user never needs to know how the agents are wired together. They only see the outcome and the cost.

---

## 3. Participants and Team Structure

| Parameter | Detail |
|-----------|--------|
| Total Participants | ~60 people |
| Original Teams | 30 project teams (2 people each) |
| Sprint Teams | 11 new teams of 5 people each |
| Team Composition | Cross pollinated from original teams |

Teams are newly formed for this sprint. We deliberately mix participants from different original project teams. This encourages fresh thinking and new collaborations. It prevents teams from simply extending their existing work.

---

## 4. The Challenge

### 4.1 What Teams Must Build

Each team must complete the following requirements:

1. **Define a real business problem.** The use case must reflect genuine friction experienced by a real user in a real domain. Judges will evaluate whether the problem is meaningful and whether the solution would create tangible value if deployed.

2. **Build a user facing interface that abstracts all complexity.** The front end should feel like a product. Users state what they want as a job to be done. The system handles everything else. The x402 endpoints and agent orchestration run invisibly in the backend alongside the payment logic.

3. **Implement and verify at least two x402 endpoints.** Each team MUST:
   - Build at least 2 working x402 endpoints
   - Each endpoint must perform a distinct and meaningful function within the overall workflow
   - The combination of endpoints must form a coherent and value generating pipeline
   - **Show the working endpoints to the designated verifier**
   - **Obtain verification and receive a Green Card for each endpoint**

4. **Surface a USDC payment request at the right moment.** The system should present a payment request in USDC at a natural decision point in the user journey. This happens after value has been demonstrated but before delivery is completed. This is the x402 moment where the user pays to unlock the result.

5. **Obtain Green Cards for endpoint verification.** Teams must have their endpoints verified by a designated technical verifier before presenting to judges. The verifier is not a judge. Each verified working endpoint earns a Green Card. **Teams must hold at least 2 Green Cards to be eligible to present.**

### 4.2 Illustrative Use Case

Consider the following illustrative scenario to help teams understand the spirit of the challenge.

An author wants to conduct a literature review on Reverse Logistics. They open the application and type a request. They say they want to research Reverse Logistics and find the articles they need. They want to select the articles and put them in their Google Drive.

Behind the scenes an intent agent breaks this request into sub tasks. It calls separate x402 endpoints. One endpoint searches SSRN. Another queries ProQuest. Another checks JSTOR. Each endpoint returns a list of relevant articles along with pricing. The user sees a clean results screen and selects the articles they want. They receive a single USDC payment request. Upon payment the selected articles are delivered directly to their Google Drive.

This example illustrates the key principles. It shows a real user problem with clean abstraction. It demonstrates multiple x402 endpoints working in concert. It highlights a payment request that appears only when the user is ready to act. Teams should not replicate this use case. They are expected to identify their own domain and problem.

---

## 5. Gamification Mechanics

### 5.1 Consulting Tokens

Each team receives 2 Consulting Tokens at the start of the sprint. A token can be redeemed to request a one on one consulting session with any member of the Algorand team. The judges are excluded from this. Consulting sessions are time boxed. They are intended to help teams unblock technical challenges or validate their use case. They also provide guidance on endpoint design.

Teams should use their tokens strategically. Tokens are a finite resource and may be the difference between a working endpoint and a stalled build.

### 5.2 Green Cards

A Green Card is issued by a designated technical verifier after they confirm that a team endpoint is functional. The verifier is not a judge and does not evaluate the quality or novelty of the use case. They only confirm that the endpoint works as described.

Green Cards serve two purposes. They act as a technical passport that allows a team to present to the judges. They also signal the depth of technical implementation. A team with 3 Green Cards has built more working endpoints than a team with 2.

**The minimum requirement to present is 2 Green Cards, which means 2 verified working endpoints.**

---

## 6. Presentation Format

| Stage | Duration |
|-------|----------|
| Team Pitch | 3 minutes |
| Judge Q&A | 2 minutes |
| Total per Team | 5 minutes |

Teams should cover specific points during the pitch. They must explain the business problem they identified and the user experience they built. They must state how many x402 endpoints are running in the backend as evidenced by Green Cards. They must explain why their solution would create real value. The Green Cards are presented to the judges at the start of the pitch as verification of technical delivery.

---

## 7. Judging Criteria

Judging is conducted by a panel of designated judges. The technical verification of endpoints is handled separately by verifiers and is not part of the judging process. Judges evaluate on the following dimensions:

| Criterion | Description |
|-----------|-------------|
| Real Business Value | Does the use case solve a genuine problem? Would a real user pay for this? |
| Novelty of Application | Is the use case original and creative? Does it go beyond obvious applications? |
| Quality of Abstraction | Does the front end feel like a product? Is the user experience clean? |
| Depth of Implementation | How many working endpoints does the team have? How well do they work together? |
| Clarity of Presentation | Is the problem and solution communicated clearly within the 3 minute pitch? |
| Clear Code | Is the codebase well-structured, readable, and maintainable? |

---

## 8. Roles and Responsibilities

| Role | Responsibility |
|------|-----------------|
| Participants | Build the use case, implement endpoints, obtain Green Cards, pitch to judges |
| Judges | Evaluate use cases on novelty, business value, and presentation quality |
| Verifiers | Check that x402 endpoints are functional and issue Green Cards |
| Algorand Team | Available for consulting when approached with a Consulting Token |
| Event Organisers | Manage time, distribute tokens and cards, facilitate smooth flow |

---

## 9. Timeline

| Time | Activity |
|------|----------|
| T+0:00 | Teams announced and Consulting Tokens distributed |
| T+0:15 | Problem definition and use case scoping |
| T+1:00 | Build phase begins and verifiers available for Green Card checks |
| T+2:30 | Final builds and last Green Card verifications |
| T+3:00 | Pitches begin with 5 minutes per team |
| T+3:50 | Judges deliberate |
| T+5:00 | Winners announced |

---

## 10. Prizes

Prizes to be announced. Details to be defined by the organising team prior to the event.

---

## 11. Summary

The x402 Build Sprint is not a traditional hackathon. It is a focused and time boxed challenge that asks participants to think like product builders and infrastructure architects simultaneously. The best teams will be those who find a problem worth solving. They will build an interface that makes the solution feel effortless. They will wire together x402 endpoints on Algorand powered by goPlausible in a way that is genuinely novel. The Green Card system ensures technical integrity. The Consulting Tokens add a layer of strategic resource management. The 5 minute pitch format keeps the energy high and the bar clear.

This is x402 in action. Agents do real work. Users get real value. Payments flow seamlessly on Algorand.

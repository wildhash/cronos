# Cronox ParallelPay

**Agentic, gasless x402 micropayments + streaming payouts with SLA-backed refunds on Cronos.**

---

## 🚀 30-Second Pitch

**Cronox ParallelPay** is production-grade payment infrastructure for the AI agent economy:

- **🔐 x402 Gasless Micropayments**: HTTP 402 protocol with EIP-3009 — buyers pay zero gas fees
- **🤖 Agentic Buyers & Sellers**: Autonomous agents handle the complete payment flow
- **📊 SLA-Backed Refunds**: Graduated refund tiers (10%/25%/50%) triggered automatically on service breaches
- **⚡ Cronos-Native**: Built on Cronos EVM with USDC.e, integrated with Cronos x402 Facilitator
- **⏱️ One-Command Demo**: `npm run demo` — see the full flow in under 60 seconds

**Live now** on Cronos Testnet. Ready for production deployment.

---

## 🎯 Judge Mode (60-Second Demo)

**Experience the complete x402 payment flow:**

```bash
# 1. Clone
git clone https://github.com/wildhash/cronox.git
cd cronox

# 2. Install
npm install --legacy-peer-deps

# 3. Configure
cp .env.example .env
# Edit .env: Add your PRIVATE_KEY (testnet wallet with USDC.e)

# 4. Run
npm run demo
```

### What You'll See

The demo orchestrates three services and executes the complete flow:

1. **Seller API** starts on `http://localhost:3001`
2. **Dashboard** starts on `http://localhost:3000`
3. **Buyer Agent** executes:
   - ✅ Requests `/api/premium-data` → Receives HTTP 402
   - ✅ Signs EIP-3009 payment authorization (gasless!)
   - ✅ Retries with `X-PAYMENT` header
   - ✅ Seller verifies & settles via Cronos Facilitator
   - ✅ Returns premium data + txHash
   - ✅ Receipt stored locally + visible in dashboard

**Terminal Output Highlights:**
```
✓ Seller API is ready!
✓ Dashboard is ready!
▶ Running Buyer Agent...
  [Agent] Received 402 Payment Required
  [Agent] Signing EIP-3009 authorization...
  [Agent] Payment successful!
  [Agent] TxHash: 0x1234...
  [Agent] Explorer: https://explorer.cronos.org/testnet/tx/0x1234...

✓ DEMO SUCCESS - All Checks Passed!
```

**Exit Codes:**
- `0` = Success (402 received, payment settled, txHash returned)
- `1` = Failure (service timeout, settlement failed, facilitator unreachable)

---

## 📋 Demo Scenarios

### Scenario A: Basic x402 Paywall

**Purpose**: Demonstrate HTTP 402 payment challenge and gasless settlement.

```bash
npm run demo
```

**Flow:**
1. Buyer requests protected resource without payment
2. Seller returns `402 Payment Required` with x402 JSON (including `schemaVersion: "1.0.0"`)
3. Buyer generates EIP-3009 authorization (no gas required)
4. Buyer retries with `X-PAYMENT` header
5. Seller verifies signature via Facilitator `/verify`
6. Seller settles payment via Facilitator `/settle`
7. Seller returns premium data + txHash
8. Receipt persisted to `data/receipts.json`

**Success Criteria:**
- HTTP 402 response includes all required schema fields
- Settlement txHash returned
- Explorer link works
- Dashboard shows payment

---

### Scenario B: Streaming SLA Contract

**Purpose**: Show SLA-backed payment streams with graduated refund tiers.

**SLA Configuration** (`examples/sla-demo.json`):
- **Latency**: p95 < 200ms
- **Uptime**: 99.9% availability
- **Jitter**: < 50ms variance
- **Error Rate**: < 0.5% failures

**Refund Tiers:**
| Breach Type | Condition | Refund |
|-------------|-----------|--------|
| Minor | p95 latency >200ms for 5 min | 10% |
| Moderate | Daily uptime <99.5% | 25% |
| Severe | Uptime <99% OR p99 >500ms | 50% |
| Critical | 3+ severe in 24h | 100% + auto-cancel |

**View Configuration:**
```bash
cat examples/sla-demo.json
```

---

### Scenario C: SLA Breach + Refund

**Purpose**: Simulate service degradation and trigger automatic refunds.

```bash
# Option 1: Latency breach (10% refund)
npm run demo:sla

# Option 2: Uptime breach (25% refund)
npm run demo:sla uptime
```

**What Happens:**
1. Services start normally
2. Script simulates artificial latency spike or uptime drop
3. Breach detection logic triggers
4. Refund event recorded to dashboard
5. Terminal shows:
   ```
   🚨 SLA BREACH DETECTED!
     Breached requests: 5/5
     Average latency: 350ms (threshold: 200ms)
     Refund tier: 10% (Minor Breach)
     Action: Partial refund triggered
   ```

**Check Results:**
- Dashboard: `http://localhost:3000`
- API: `http://localhost:3000/api/refunds`
- Receipts: `data/receipts.json`

---

## 🔐 Protocol Invariants

**Every paid resource interaction guarantees:**

1. **Verifiable Receipt**
   - Unique txHash on Cronos blockchain
   - EIP-3009 signature verification via Facilitator
   - Persisted locally (`data/receipts.json`) and on-chain

2. **Explorer Traceability**
   - Every txHash links to Cronos Explorer
   - Full transaction details: sender, recipient, amount, timestamp
   - Example: `https://explorer.cronos.org/testnet/tx/0x1234...`

3. **Facilitator Signature**
   - All settlements go through Cronos x402 Facilitator
   - Gasless for buyers (EIP-3009 `transferWithAuthorization`)
   - Verifiable via Facilitator `/verify` endpoint

4. **SLA Breach Handling**
   - Deterministic refund policy (graduated tiers)
   - Audit log entry for every breach
   - Refund receipts stored with original txHash reference
   - Auto-cancellation on critical breach (3+ severe)

5. **Schema Compliance**
   - All 402 responses validate against `contracts/x402.json`
   - `schemaVersion: "1.0.0"` in every response
   - Required fields: `amount`, `currency`, `recipient`, `chainId`, `facilitatorUrl`

---

## 🛠️ Advanced: CI/Offline Mode

**Run the demo without blockchain interaction:**

```bash
npm run demo:dry
```

**Use Cases:**
- CI/CD pipelines (no wallet needed)
- Offline development
- Schema validation testing
- Health check verification

**What It Tests:**
- Services start successfully
- `/api/health` returns proper metadata
- 402 responses match x402 schema
- All required fields present

**Exit codes same as full demo** (0 = pass, 1 = fail).

---

## ✅ What's Working Today

### Production Ready
- ✅ **x402 Protocol**: Full HTTP 402 challenge-response flow with schema v1.0.0
- ✅ **Gasless Payments**: EIP-3009 `transferWithAuthorization` - buyers pay no gas
- ✅ **Facilitator Integration**: Verify & settle via Cronos x402 Facilitator
- ✅ **Buyer Agent**: Autonomous agent that detects 402 and handles payment
- ✅ **Seller API**: Express server with x402 middleware
- ✅ **Dashboard**: Real-time payment receipt viewer with explorer links
- ✅ **Receipt Persistence**: Local storage of all payment/refund receipts
- ✅ **Smart Contracts**: SLA-backed streaming with graduated refund tiers
- ✅ **SLA Breach Demo**: Simulated latency/uptime breaches with refund triggers

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────────────────────────────┐
                    │                  CRONOX x402 FLOW                    │
                    └─────────────────────────────────────────────────────┘

   ┌─────────────┐         1. GET /api/data          ┌─────────────────────┐
   │             │ ────────────────────────────────▶ │                     │
   │  BUYER      │                                   │   SELLER API        │
   │  AGENT      │ ◀──── 2. HTTP 402 + Requirements  │   (x402 Server)     │
   │             │                                   │                     │
   │  (AI/CLI)   │         3. X-PAYMENT header       │   /api/premium-data │
   │             │ ────────────────────────────────▶ │   /api/ai-inference │
   └─────────────┘                                   └──────────┬──────────┘
         │                                                      │
         │ EIP-3009                               4. /verify    │
         │ Authorization                          5. /settle    │
         ▼                                                      ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                     CRONOS x402 FACILITATOR                         │
   │  • Verifies EIP-3009 signatures                                     │
   │  • Settles USDC.e payments (gasless for buyer)                      │
   │  • Returns txHash for proof                                         │
   └─────────────────────────────────────────────────────────────────────┘
                                    │ Settlement
                                    ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                         CRONOS EVM                                  │
   │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
   │  │ SLAStreamFactory │  │  RefundManager   │  │   AgentOracle    │  │
   │  │ • Create streams │  │ • Partial refund │  │ • Submit metrics │  │
   │  │ • SLA config     │  │ • Full refund    │  │ • Breach detect  │  │
   │  │ • Auto-stop      │  │ • Graduated tier │  │ • Signed reports │  │
   │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
   │  USDC.e: 0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0 (testnet)      │
   └─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation & Deployment

### Prerequisites

1. **Node.js 18+** installed
2. **Testnet tokens**:
   - CRO (for gas): [Cronos Faucet](https://cronos.org/faucet)
   - USDC.e (for payments): [USDC.e Faucet](https://faucet.cronos.org)

### Installation

```bash
git clone https://github.com/wildhash/cronox.git
cd cronox
npm install --legacy-peer-deps

cp .env.example .env
# Edit .env: Add your PRIVATE_KEY
```

### Deploy Contracts (Optional)

```bash
# Deploy to Cronos Testnet
npm run deploy:cronos-testnet

# Or deploy to Cronos Mainnet
npm run deploy:cronos
```

**Note:** Demo works without deploying contracts (uses pre-deployed addresses).

---

## 📋 x402 Protocol Specification

The x402 payment protocol is formally specified in [`contracts/x402.json`](contracts/x402.json) (JSON Schema v1.0.0).

### 402 Payment Required Response

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Required: true
```

```json
{
  "schemaVersion": "1.0.0",
  "paymentRequired": true,
  "amount": "100000",
  "currency": "USDC.e",
  "recipient": "0x1234...",
  "chainId": 338,
  "token": "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
  "facilitatorUrl": "https://facilitator.cronoslabs.org/v2/x402",
  "description": "Premium market data access",
  "network": "Cronos Testnet"
}
```

### X-PAYMENT Header Format

Client retries with `X-PAYMENT` header (base64-encoded JSON):

```json
{
  "type": "eip3009",
  "chainId": 338,
  "token": "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
  "from": "0x9876...",
  "to": "0x1234...",
  "value": "100000",
  "validAfter": 0,
  "validBefore": 1737374400,
  "nonce": "0x1234...",
  "v": 27,
  "r": "0xabcd...",
  "s": "0x1234..."
}
```

All responses are validated against the schema to ensure compliance.

---

## 🔧 API Reference

### Seller API Endpoints

```
GET  /api/health            - Health check with metadata
GET  /api/pricing           - View pricing information
GET  /api/premium-data      - Premium data (requires x402 payment)
GET  /api/ai-inference      - AI inference (requires x402 payment)
GET  /api/payments          - List recent payments
GET  /api/payments/:txHash  - Get specific payment
```

### Dashboard Endpoints

```
GET  /api/health            - Health check
GET  /api/info              - Deployment information
GET  /api/stats             - Network statistics
GET  /api/payments          - List x402 payments with explorer links
GET  /api/refunds           - List refund events
GET  /api/streams/:count    - List payment streams
GET  /api/stream/:id        - Get stream details
```

---

## 🌐 Network Configuration

### Cronos Testnet
- **Chain ID**: 338
- **RPC**: `https://evm-t3.cronos.org`
- **Explorer**: `https://explorer.cronos.org/testnet`
- **USDC.e**: `0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0`
- **Faucets**:
  - CRO: https://cronos.org/faucet
  - USDC.e: https://faucet.cronos.org

### Cronos Mainnet
- **Chain ID**: 25
- **RPC**: `https://evm.cronos.org`
- **Explorer**: `https://explorer.cronos.org`
- **USDC.e**: `0xc21223249CA28397B4B6541dfFaEcC539BfF0c59`

### x402 Facilitator
- **URL**: `https://facilitator.cronoslabs.org/v2/x402`
- **Endpoints**: `/verify`, `/settle`, `/supported`

---

## 📜 Scripts & Commands

```bash
# Demo modes
npm run demo           # Full cinematic demo (60 seconds)
npm run demo:dry       # CI/offline mode (no blockchain)
npm run demo:sla       # SLA breach simulation
npm run demo:watch     # Manual mode: start services only

# Services
npm run seller-api     # Start x402 seller server
npm run buyer-agent    # Run autonomous buyer agent
npm run dashboard      # Start dashboard UI

# Development
npm run compile        # Compile Solidity contracts
npm run deploy:cronos-testnet  # Deploy to testnet
npm run test           # Run full test suite
npm run test-smoke     # Run smoke tests only
```

---

## 🎓 Use Cases

1. **API Monetization**: Pay-per-call APIs with automatic refunds on downtime
2. **AI Agent Services**: Agents autonomously pay for compute, data, or inference
3. **Data Streaming**: Real-time feeds with latency guarantees
4. **CDN Services**: Content delivery with availability SLAs
5. **Cloud Infrastructure**: Pay-per-use compute with uptime guarantees

---

## 🏆 Hackathon: Cronos x402 Paytech

**January 2026 Submission**

### Tracks
- ✅ Main Track: x402 Applications
- ✅ x402 Agentic Finance Track
- ✅ Crypto.com Ecosystem Integration
- ✅ Dev Tooling Track

### What We Built
1. Full x402 integration (seller + buyer + facilitator)
2. SLA-backed streaming with graduated refund tiers
3. Autonomous buyer agent with payment handling
4. Real-time dashboard with explorer links
5. Receipt persistence and audit trail
6. One-command cinematic demo

---

## 📚 Resources

- [Cronos x402 Facilitator Docs](https://docs.cronos.org/cronos-x402-facilitator/introduction)
- [Quick Start for Sellers](https://docs.cronos.org/cronos-x402-facilitator/quick-start-for-sellers)
- [Quick Start for Buyers](https://docs.cronos.org/cronos-x402-facilitator/quick-start-for-buyers)
- [Cronos EVM Docs](https://docs.cronos.org)
- [Crypto.com AI Agent SDK](https://ai-agent-sdk-docs.crypto.com/)

---

## 🔧 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill processes on ports 3000/3001
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Missing PRIVATE_KEY:**
```bash
cp .env.example .env
# Edit .env and add your testnet private key
```

**Insufficient funds:**
- Get CRO: https://cronos.org/faucet
- Get USDC.e: https://faucet.cronos.org

**Facilitator unreachable:**
```bash
# Test connectivity
curl https://facilitator.cronoslabs.org/v2/x402/supported
```

---

## 📄 License

ISC

---

## 🖼️ Screenshots

<!-- TODO: Add demo screenshots -->
<!-- ![Terminal Demo](./assets/demo-terminal.png) -->
<!-- ![Dashboard UI](./assets/demo-dashboard.png) -->

_Screenshots coming soon. Run `npm run demo` to see the live demo._

---

**Built for Cronos x402** | Gasless Agentic Payments | SLA-Backed Streams | Automatic Refunds

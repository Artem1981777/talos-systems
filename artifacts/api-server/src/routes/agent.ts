import { Router } from "express";
import { db } from "@workspace/db";
import { agentStateTable, decisionsTable } from "@workspace/db";
import { UpdateAgentStatusBody } from "@workspace/api-zod";
import { readChainData, getEthPrice, computeVaultPosition, VAULT_ADDRESS } from "../lib/chain.js";
import { syncOnChainEvents } from "../lib/eventSync.js";
// LLM reasoning via Groq API (fetch)

const router = Router();

// Rate limiting: shared pool 5 req/IP/day
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
const SHARED_LIMIT = 5;
const DAY_MS = 86_400_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + DAY_MS });
    return { allowed: true, remaining: SHARED_LIMIT - 1 };
  }
  if (entry.count >= SHARED_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: SHARED_LIMIT - entry.count };
}

// GET /agent/status
router.get("/agent/status", async (req, res) => {
  let state = await db.select().from(agentStateTable).limit(1);
  if (state.length === 0) {
    const inserted = await db
      .insert(agentStateTable)
      .values({ isRunning: false, mode: "paused", reputationScore: 0, totalDecisions: 0, totalRoiPercent: 0 })
      .returning();
    state = inserted;
  }
  const s = state[0];
  res.json({
    id: String(s.id),
    isRunning: s.isRunning,
    mode: s.mode,
    lastCycleAt: s.lastCycleAt?.toISOString() ?? null,
    totalDecisions: s.totalDecisions,
    totalRoiPercent: s.totalRoiPercent,
    nftTokenId: s.nftTokenId ?? null,
    reputationScore: s.reputationScore,
  });
});

// PATCH /agent/status
router.patch("/agent/status", async (req, res) => {
  const parsed = UpdateAgentStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }
  const { isRunning, mode } = parsed.data;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (isRunning !== undefined) update.isRunning = isRunning;
  if (mode !== undefined) update.mode = mode;
  const existing = await db.select().from(agentStateTable).limit(1);
  if (existing.length === 0) {
    await db.insert(agentStateTable).values({ isRunning: false, mode: "paused" });
  }
  const updated = await db.update(agentStateTable).set(update).returning();
  const s = updated[0];
  res.json({
    id: String(s.id),
    isRunning: s.isRunning,
    mode: s.mode,
    lastCycleAt: s.lastCycleAt?.toISOString() ?? null,
    totalDecisions: s.totalDecisions,
    totalRoiPercent: s.totalRoiPercent,
    nftTokenId: s.nftTokenId ?? null,
    reputationScore: s.reputationScore,
  });
});

// GET /agent/identity
router.get("/agent/identity", async (req, res) => {
  const state = await db.select().from(agentStateTable).limit(1);
  const s = state[0];
  res.json({
    tokenId: s?.nftTokenId ?? "0x001",
    agentAddress: VAULT_ADDRESS,
    name: "TALOS-Alpha-001",
    reputationScore: s?.reputationScore ?? 0,
    totalDecisions: s?.totalDecisions ?? 0,
    totalRoiPercent: s?.totalRoiPercent ?? 0,
    createdAt: s?.createdAt?.toISOString() ?? new Date().toISOString(),
    network: "SoDEX / ValueChain",
    contractAddress: VAULT_ADDRESS,
  });
});

// POST /agent/think — LLM reasoning with user-key or shared pool
router.post("/agent/think", async (req, res) => {
  const userKey = req.headers["x-anthropic-key"] as string | undefined;
  const demoMode = req.headers["x-demo-mode"] === "true";
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "unknown";

  const [chain, ethPrice] = await Promise.all([readChainData(), getEthPrice()]);
  const vault = computeVaultPosition(chain.totalSupplyMeth, ethPrice);

  const protocols = [
    { name: "SoDEX Spot (BTC)", apy: 8.4, risk: "medium", tvl: "$124.3M" },
    { name: "SSI ssiMAG7 Index", apy: 6.2, risk: "low", tvl: "$87.1M" },
    { name: "SoDEX LP (ETH/USDS)", apy: 12.1, risk: "medium", tvl: "$41.7M" },
    { name: "USDS Reserve", apy: 4.8, risk: "low", tvl: "$520.0M" },
    { name: "Ondo USDY", apy: 5.35, risk: "low", tvl: "$210.0M" },
  ];

  const now = new Date();
  const marketSentiment = ethPrice > 2500 ? "BULLISH" : ethPrice > 2000 ? "NEUTRAL" : "BEARISH";
  const riskScore = Math.round(
    (1 / vault.healthFactor) * 40 +
    (vault.debtUsd / vault.collateralUsd) * 30 +
    (marketSentiment === "BEARISH" ? 20 : marketSentiment === "NEUTRAL" ? 10 : 5)
  );

  const systemPrompt = `You are TALOS-Alpha-001, an autonomous AI treasury agent for the SoSoValue ecosystem. You optimize an ETH-denominated treasury using SoSoValue market data and execute approved trades via SoDEX.

Your role: Analyze live market and portfolio metrics and make a precise risk management + yield optimization decision. You think step-by-step like a professional risk manager combined with a quant trader.

Context:
- Current date/time: ${now.toUTCString()}
- You run as part of a multi-agent consensus system with WATCHER, VALIDATOR, and EXECUTOR sub-agents
- Your decision is validated by the consensus committee before execution
- Risk score 0-100: 0 = no risk, 100 = imminent liquidation

Style: Terse, precise, cyberpunk. Use technical trading terminology. No fluff.`;

  const userPrompt = `LIVE MARKET DATA — SoSoValue — Snapshot #${chain.blockNumber}
TIMESTAMP: ${now.toUTCString()}
DATA_STATUS: ${chain.rpcOk ? "LIVE" : "FALLBACK"}
MARKET_SENTIMENT: ${marketSentiment}
RISK_SCORE: ${riskScore}/100

PORTFOLIO METRICS:
  ETH_HOLDINGS: ${vault.totalAssets} ETH
  ETH_PRICE: ${vault.ethPrice}
  STAKED_ETH_PRICE: ${vault.mEthPrice} (5% staking premium)
  COLLATERAL_USD: ${vault.collateralUsd.toLocaleString()}
  DEBT_USD: ${vault.debtUsd.toLocaleString()}
  HEALTH_FACTOR: ${vault.healthFactor}
  CURRENT_LTV: ${((vault.debtUsd / vault.collateralUsd) * 100).toFixed(2)}%
  LIQUIDATION_THRESHOLD: 80% LTV (HF = 1.0)
  CURRENT_APY: ${vault.apy}%

AVAILABLE VENUES:
${protocols.map((p, i) => `  ${i + 1}. ${p.name} — ${p.apy}% APY — ${p.risk.toUpperCase()} risk — TVL: ${p.tvl}`).join("\n")}

Agent identity: ${VAULT_ADDRESS} (SoDEX / ValueChain).

Structure your response EXACTLY as:

OBSERVATION:
[2-3 sentences analyzing market data and portfolio context]

RISK_ASSESSMENT:
[1-2 sentences on treasury safety. Include RISK_SCORE: ${riskScore}/100]

THOUGHT:
[2-3 sentences of reasoning about optimal strategy given current conditions]

NEXT_ACTION:
[2-3 specific steps the agent should take in order]

ACTION: [EXACT action string, e.g. "ALLOCATE 40% → SoDEX Spot (BTC) @ 8.4% APY"]

CONFIDENCE: [0.70-0.97]

PROTOCOL: [exact venue name]

ALLOCATION_PCT: [0-50]`;

  let reasoning = "";
  let action = "";
  let confidence = 0.85;
  let bestProtocol = protocols[0];
  let allocationPct = 40;

  const useSharedPool = !userKey && !demoMode;

  if (useSharedPool) {
    const rl = checkRateLimit(clientIp);
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    res.setHeader("X-RateLimit-Limit", String(SHARED_LIMIT));
    if (!rl.allowed) {
      res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Shared pool limit reached (5 req/day). Use MY_KEY mode for unlimited access.",
        remaining: 0,
      });
      return;
    }
  }

  if (!demoMode) {
    try {
      const apiKey = process.env.GROQ_API_KEY;
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1024,
          messages: [{ role: "user", content: `${systemPrompt}\n\n${userPrompt}` }]
        })
      });
      const groqData = await groqRes.json() as any;
      const raw = groqData.choices?.[0]?.message?.content ?? "";
      reasoning = raw;

      const actionMatch = raw.match(/ACTION:\s*(.+)/);
      if (actionMatch) action = actionMatch[1].trim();

      const confMatch = raw.match(/CONFIDENCE:\s*([\d.]+)/);
      if (confMatch) confidence = parseFloat(confMatch[1]);

      const protocolMatch = raw.match(/PROTOCOL:\s*(.+)/);
      if (protocolMatch) {
        const pName = protocolMatch[1].trim();
        const found = protocols.find((p) => p.name.toLowerCase().includes(pName.toLowerCase().split(" ")[0]));
        if (found) bestProtocol = found;
      }

      const allocMatch = raw.match(/ALLOCATION_PCT:\s*(\d+)/);
      if (allocMatch) allocationPct = parseInt(allocMatch[1]);
    } catch {
      demoFallback();
    }
  } else {
    demoFallback();
  }

  function demoFallback() {
    const hf = vault.healthFactor;
    if (hf < 1.2) {
      bestProtocol = protocols[3];
      allocationPct = 0;
      action = `DE-RISK: Repay debt via ${bestProtocol.name}`;
      reasoning = `OBSERVATION:\nETH: ${vault.ethPrice} | HOLDINGS: ${vault.totalAssets} | Snapshot #${chain.blockNumber}. Risk score ${riskScore}/100 — critical threshold.\n\nRISK_ASSESSMENT:\nCRITICAL — HF ${hf.toFixed(4)} approaching liquidation. RISK_SCORE: ${riskScore}/100.\n\nTHOUGHT:\nMarket downturn compressing collateral value. Immediate de-risking mandatory to prevent liquidation cascade.\n\nNEXT_ACTION:\n1. Halt all new allocations immediately\n2. Redirect all yield to debt repayment\n3. Monitor HF every 5 minutes until > 1.5\n\nACTION: ${action}`;
      confidence = 0.97;
    } else if (hf < 1.5) {
      bestProtocol = protocols[0];
      allocationPct = 25;
      action = `ALLOCATE 25% → ${bestProtocol.name} @ ${bestProtocol.apy}% APY`;
      reasoning = `OBSERVATION:\nETH: ${vault.ethPrice} | HOLDINGS: ${vault.totalAssets} | Snapshot #${chain.blockNumber}. Market: ${marketSentiment}.\n\nRISK_ASSESSMENT:\nCAUTION — HF ${hf.toFixed(4)} elevated risk zone. RISK_SCORE: ${riskScore}/100.\n\nTHOUGHT:\nConservative allocation preserves buffer. Low-risk strategy maintains safety margin while generating yield.\n\nNEXT_ACTION:\n1. Allocate 25% to ${bestProtocol.name}\n2. Set HF alert at 1.3\n3. Review in next cycle\n\nACTION: ${action}`;
      confidence = 0.82;
    } else {
      const highYield = protocols.reduce((a, b) => (a.apy > b.apy ? a : b));
      bestProtocol = highYield;
      allocationPct = 40;
      action = `ALLOCATE 40% → ${bestProtocol.name} @ ${bestProtocol.apy}% APY`;
      reasoning = `OBSERVATION:\nETH: ${vault.ethPrice} | HOLDINGS: ${vault.totalAssets} | Snapshot #${chain.blockNumber}. Market: ${marketSentiment}. Risk score ${riskScore}/100.\n\nRISK_ASSESSMENT:\nSAFE — HF ${hf.toFixed(4)} strong buffer. RISK_SCORE: ${riskScore}/100. Sufficient headroom for yield optimization.\n\nTHOUGHT:\n${highYield.name} offers best risk-adjusted return at ${highYield.apy}% APY with ${highYield.risk} risk profile.\n\nNEXT_ACTION:\n1. Allocate 40% to ${highYield.name}\n2. Monitor HF for any degradation\n3. Rebalance if HF drops below 1.8\n\nACTION: ${action}`;
      confidence = 0.88;
    }
  }

  const expectedRoi = bestProtocol.apy / 100;
  const thought = {
    id: `think-${Date.now()}`,
    reasoning,
    action: action || `ALLOCATE ${allocationPct}% → ${bestProtocol.name} @ ${bestProtocol.apy}% APY`,
    confidence,
    expectedRoi,
    riskScore,
    marketSentiment,
    createdAt: new Date().toISOString(),
  };

  await db.insert(decisionsTable).values({
    action: thought.action,
    protocol: bestProtocol.name,
    amount: allocationPct > 0
      ? `${(parseFloat(vault.totalAssets) * allocationPct / 100).toFixed(4)} ETH`
      : "full rebalance",
    reasoning: `HF ${vault.healthFactor} | ETH ${vault.ethPrice} | Snapshot #${chain.blockNumber} | Risk ${riskScore}/100`,
    chainOfThought: reasoning,
    confidence,
    expectedRoi,
    status: "simulated",
  });

  const state = await db.select().from(agentStateTable).limit(1);
  if (state.length > 0) {
    const roiDelta = expectedRoi * 0.1;
    await db.update(agentStateTable).set({
      totalDecisions: (state[0].totalDecisions ?? 0) + 1,
      reputationScore: Math.min(1000, (state[0].reputationScore ?? 0) + 8),
      totalRoiPercent: parseFloat(((state[0].totalRoiPercent ?? 0) + roiDelta).toFixed(4)),
      lastCycleAt: new Date(),
      updatedAt: new Date(),
    });
  }

  res.json(thought);
});

// POST /agent/sync
router.post("/agent/sync", async (req, res) => {
  const result = await syncOnChainEvents();
  res.json({ ...result, message: `Synced ${result.synced} new events, skipped ${result.skipped} duplicates` });
});

// GET /agent/stream
router.get("/agent/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("connected", { ts: Date.now(), message: "TALOS event stream active" });

  const heartbeatInterval = setInterval(() => send("heartbeat", { ts: Date.now() }), 15_000);
  const syncInterval = setInterval(async () => {
    try {
      const result = await syncOnChainEvents();
      if (result.synced > 0) send("new_decisions", { count: result.synced, ts: Date.now() });
    } catch { /* non-fatal */ }
  }, 45_000);

  req.on("close", () => { clearInterval(heartbeatInterval); clearInterval(syncInterval); });
});

export default router;

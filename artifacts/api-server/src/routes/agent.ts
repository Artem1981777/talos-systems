import { Router } from "express";
import { db } from "@workspace/db";
import { agentStateTable, decisionsTable } from "@workspace/db";
import { UpdateAgentStatusBody } from "@workspace/api-zod";
import { readChainData, getEthPrice, computeVaultPosition, VAULT_ADDRESS } from "../lib/chain.js";
import { syncOnChainEvents } from "../lib/eventSync.js";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

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
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
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
    network: "Mantle Sepolia",
    contractAddress: VAULT_ADDRESS,
  });
});

// POST /agent/think — real on-chain data + GPT-5 reasoning
router.post("/agent/think", async (_req, res) => {
  const [chain, ethPrice] = await Promise.all([readChainData(), getEthPrice()]);
  const vault = computeVaultPosition(chain.totalSupplyMeth, ethPrice);

  const protocols = [
    { name: "Merchant Moe", apy: 8.4, risk: "low", tvl: "$124.3M" },
    { name: "Agni Finance", apy: 6.2, risk: "low", tvl: "$87.1M" },
    { name: "Fluxion mETH/USDY LP", apy: 12.1, risk: "medium", tvl: "$41.7M" },
    { name: "Mantle Staking", apy: 4.8, risk: "low", tvl: "$520.0M" },
    { name: "Ondo USDY", apy: 5.35, risk: "low", tvl: "$210.0M" },
  ];

  const systemPrompt = `You are TALOS-Alpha-001, an autonomous AI agent running on Mantle Network with ERC-8004 Agent Identity NFT token #0x001. You protect and optimize a mETH (Mantle ETH) yield vault.

Your role: Analyze real on-chain vault metrics and make a precise risk management + yield optimization decision. You think step by step like a professional DeFi risk manager combined with a quant trader.

Style: Terse, precise, cyberpunk. Use technical DeFi terminology. Structure your response with clear labeled sections: OBSERVATION, RISK_ASSESSMENT, THOUGHT, ACTION. No fluff.`;

  const userPrompt = `LIVE CHAIN DATA — Mantle Sepolia — Block #${chain.blockNumber}
RPC_STATUS: ${chain.rpcOk ? "LIVE" : "FALLBACK"}
TIMESTAMP: ${new Date().toUTCString()}

VAULT METRICS:
  mETH_SUPPLY (on-chain): ${vault.totalAssets} mETH
  ETH_PRICE: $${vault.ethPrice}
  mETH_PRICE: $${vault.mEthPrice} (5% staking premium)
  COLLATERAL_USD: $${vault.collateralUsd.toLocaleString()}
  DEBT_USD: $${vault.debtUsd.toLocaleString()}
  HEALTH_FACTOR: ${vault.healthFactor}
  CURRENT_LTV: ${((vault.debtUsd / vault.collateralUsd) * 100).toFixed(2)}%
  LIQUIDATION_THRESHOLD: 80% LTV (HF = 1.0)
  CURRENT_APY: ${vault.apy}%

AVAILABLE PROTOCOLS:
${protocols.map((p, i) => `  ${i + 1}. ${p.name} — ${p.apy}% APY — ${p.risk.toUpperCase()} risk — TVL: ${p.tvl}`).join("\n")}

Your ERC-8004 identity is on-chain at contract ${VAULT_ADDRESS} on Mantle Sepolia.

Make a decision. Structure your response EXACTLY as:

OBSERVATION:
[2-3 sentences analyzing the on-chain data]

RISK_ASSESSMENT:
[1-2 sentences on vault safety and threat level]

THOUGHT:
[2-3 sentences of reasoning about the optimal strategy]

ACTION: [EXACT action string, e.g. "ALLOCATE 40% → Merchant Moe @ 8.4% APY"]

CONFIDENCE: [0.70-0.97, one decimal]

PROTOCOL: [exact protocol name]

ALLOCATION_PCT: [0-50, integer]`;

  let reasoning = "";
  let action = "";
  let confidence = 0.85;
  let bestProtocol = protocols[0];
  let allocationPct = 40;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Parse structured response
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
  } catch (err) {
    // Fallback to deterministic if LLM fails
    const hf = vault.healthFactor;
    if (hf < 1.2) {
      bestProtocol = protocols[3];
      allocationPct = 0;
      action = `DE-RISK: Repay debt via ${bestProtocol.name}`;
      reasoning = `CRITICAL_ALERT: Health factor ${hf.toFixed(4)} — approaching liquidation.\n\nOBSERVATION:\n  ETH: $${vault.ethPrice} | mETH: ${vault.totalAssets} | Block #${chain.blockNumber}\n\nRISK_ASSESSMENT:\n  CRITICAL — HF below 1.2. Immediate de-risking required.\n\nTHOUGHT:\n  Market downturn compressing collateral. Redirect yield to debt repayment.\n\nACTION: ${action}`;
      confidence = 0.97;
    } else if (hf < 1.5) {
      bestProtocol = protocols[0];
      allocationPct = 25;
      action = `ALLOCATE 25% → ${bestProtocol.name} @ ${bestProtocol.apy}% APY`;
      reasoning = `CAUTION: Health factor ${hf.toFixed(4)} — elevated risk.\n\nOBSERVATION:\n  ETH: $${vault.ethPrice} | mETH: ${vault.totalAssets} | Block #${chain.blockNumber}\n\nRISK_ASSESSMENT:\n  CAUTION — HF between 1.1-1.5. Conservative allocation advised.\n\nTHOUGHT:\n  Preserve capital buffer. Low-risk strategy maintains safety margin.\n\nACTION: ${action}`;
      confidence = 0.82;
    } else {
      const highYield = protocols.reduce((a, b) => (a.apy > b.apy ? a : b));
      bestProtocol = highYield;
      allocationPct = 40;
      action = `ALLOCATE 40% → ${bestProtocol.name} @ ${bestProtocol.apy}% APY`;
      reasoning = `OPTIMAL: Health factor ${hf.toFixed(4)} — vault in strong position.\n\nOBSERVATION:\n  ETH: $${vault.ethPrice} | mETH: ${vault.totalAssets} | Block #${chain.blockNumber}\n\nRISK_ASSESSMENT:\n  SAFE — HF > 1.5. Sufficient buffer for yield optimization.\n\nTHOUGHT:\n  ${highYield.name} offers highest risk-adjusted return at ${highYield.apy}% APY.\n\nACTION: ${action}`;
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
    createdAt: new Date().toISOString(),
  };

  await db.insert(decisionsTable).values({
    action: thought.action,
    protocol: bestProtocol.name,
    amount: allocationPct > 0
      ? `${(parseFloat(vault.totalAssets) * allocationPct / 100).toFixed(4)} mETH`
      : "full rebalance",
    reasoning: `HF ${vault.healthFactor} | ETH $${vault.ethPrice} | Block #${chain.blockNumber}`,
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

// POST /agent/sync — pull on-chain Transfer events into decisions table
router.post("/agent/sync", async (req, res) => {
  const result = await syncOnChainEvents();
  res.json({ ...result, message: `Synced ${result.synced} new on-chain events, skipped ${result.skipped} duplicates` });
});

// GET /agent/stream — SSE stream for real-time on-chain event notifications
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

  const heartbeatInterval = setInterval(() => {
    send("heartbeat", { ts: Date.now() });
  }, 15_000);

  const syncInterval = setInterval(async () => {
    try {
      const result = await syncOnChainEvents();
      if (result.synced > 0) {
        send("new_decisions", { count: result.synced, ts: Date.now() });
      }
    } catch {
      // Non-fatal
    }
  }, 45_000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    clearInterval(syncInterval);
  });
});

export default router;

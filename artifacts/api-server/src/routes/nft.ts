import { Router } from "express";
import { db } from "@workspace/db";
import { agentStateTable } from "@workspace/db";

const router = Router();

// NFT Metadata store (in-memory for now)
const nftStore = new Map<string, any>();

// GET /api/nft/metadata/:tokenId
router.get("/nft/metadata/:tokenId", async (req, res) => {
  const { tokenId } = req.params;
  const state = await db.select().from(agentStateTable).limit(1);
  const s = state[0];

  const reputation = s?.reputationScore ?? 0;
  const rarity = reputation >= 800 ? "LEGENDARY" : reputation >= 500 ? "EPIC" : reputation >= 200 ? "RARE" : "COMMON";

  const metadata = {
    name: `TALOS Agent #${tokenId}`,
    description: "Autonomous DeFi AI agent on Mantle Network. Part of the TALOS Genesis Collection.",
    image: `https://talos-systems--gromovartem722.replit.app/api/nft/image/${tokenId}`,
    external_url: "https://talos-systems--gromovartem722.replit.app",
    attributes: [
      { trait_type: "Network", value: "Mantle Sepolia" },
      { trait_type: "Reputation Score", value: reputation },
      { trait_type: "Total Decisions", value: s?.totalDecisions ?? 0 },
      { trait_type: "Total ROI", value: `${(s?.totalRoiPercent ?? 0).toFixed(2)}%` },
      { trait_type: "Rarity", value: rarity },
      { trait_type: "Mode", value: s?.mode ?? "autonomous" },
      { trait_type: "Collection", value: "TALOS Genesis" },
    ],
  };

  res.json(metadata);
});

// POST /api/nft/prepare-mint
router.post("/nft/prepare-mint", async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    res.status(400).json({ error: "walletAddress required" });
    return;
  }

  const state = await db.select().from(agentStateTable).limit(1);
  const s = state[0];
  const tokenId = `${Date.now()}`;

  const mintData = {
    tokenId,
    walletAddress,
    contractAddress: "0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7",
    network: "Mantle Sepolia",
    chainId: 5003,
    metadata: {
      name: `TALOS Agent #${tokenId}`,
      reputationScore: s?.reputationScore ?? 0,
      totalDecisions: s?.totalDecisions ?? 0,
    },
    status: "READY_TO_MINT",
    estimatedGas: "0.001 MNT",
  };

  nftStore.set(tokenId, mintData);
  res.json(mintData);
});

// GET /api/nft/status/:tokenId
router.get("/nft/status/:tokenId", async (req, res) => {
  const { tokenId } = req.params;
  const data = nftStore.get(tokenId);
  if (!data) {
    res.status(404).json({ error: "Token not found" });
    return;
  }
  res.json(data);
});

export default router;

import { Router } from "express";
import { readChainData, getEthPrice, computeVaultPosition, VAULT_ADDRESS } from "../lib/chain.js";

const router = Router();

// GET /vault/stats — real on-chain mETH supply + live ETH price → dynamic vault position
router.get("/vault/stats", async (req, res) => {
  try {
    const [chain, ethPrice] = await Promise.all([readChainData(), getEthPrice()]);

    const position = computeVaultPosition(chain.totalSupplyMeth, ethPrice);

    res.json({
      ...position,
      network: "Mantle Sepolia",
      blockNumber: chain.blockNumber,
      contractAddress: VAULT_ADDRESS,
      rpcOk: chain.rpcOk,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "vault stats error");
    res.status(500).json({ error: "Failed to fetch vault stats" });
  }
});

export default router;

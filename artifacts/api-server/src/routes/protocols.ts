import { Router } from "express";

const router = Router();

// GET /protocols — live APY from SoSoValue ecosystem venues
router.get("/protocols", async (req, res) => {
  // Illustrative APY data — in production these would come from venue APIs
  const protocols = [
    {
      id: "sodex-spot-btc",
      name: "SoDEX Spot (BTC)",
      apy: 8.4 + (Math.random() - 0.5) * 0.4,
      tvl: "$124.3M",
      asset: "BTC",
      risk: "medium" as const,
      recommended: true,
    },
    {
      id: "ssi-mag7",
      name: "SSI ssiMAG7 Index",
      apy: 6.2 + (Math.random() - 0.5) * 0.3,
      tvl: "$87.1M",
      asset: "ssiMAG7",
      risk: "low" as const,
      recommended: false,
    },
    {
      id: "sodex-lp-eth-usds",
      name: "SoDEX LP (ETH/USDS)",
      apy: 12.1 + (Math.random() - 0.5) * 0.8,
      tvl: "$41.7M",
      asset: "ETH/USDS LP",
      risk: "medium" as const,
      recommended: false,
    },
    {
      id: "usds-reserve",
      name: "USDS Reserve",
      apy: 4.8 + (Math.random() - 0.5) * 0.2,
      tvl: "$520.0M",
      asset: "USDS",
      risk: "low" as const,
      recommended: false,
    },
    {
      id: "ondo-usdy",
      name: "Ondo USDY",
      apy: 5.35,
      tvl: "$210.0M",
      asset: "USDY",
      risk: "low" as const,
      recommended: false,
    },
  ];

  res.json({
    protocols: protocols.map((p) => ({
      ...p,
      apy: parseFloat(p.apy.toFixed(2)),
    })),
  });
});

export default router;

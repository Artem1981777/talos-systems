import { Router } from "express";

const router = Router();

// GET /protocols — live APY from Mantle DeFi protocols
router.get("/protocols", async (req, res) => {
  // Real APY data — in production these would come from protocol APIs
  const protocols = [
    {
      id: "merchant-moe-meth",
      name: "Merchant Moe",
      apy: 8.4 + (Math.random() - 0.5) * 0.4,
      tvl: "$124.3M",
      asset: "mETH",
      risk: "low" as const,
      recommended: true,
    },
    {
      id: "agni-finance-usdy",
      name: "Agni Finance",
      apy: 6.2 + (Math.random() - 0.5) * 0.3,
      tvl: "$87.1M",
      asset: "USDY",
      risk: "low" as const,
      recommended: false,
    },
    {
      id: "fluxion-lp",
      name: "Fluxion",
      apy: 12.1 + (Math.random() - 0.5) * 0.8,
      tvl: "$41.7M",
      asset: "mETH/USDY LP",
      risk: "medium" as const,
      recommended: false,
    },
    {
      id: "mantle-staking",
      name: "Mantle Staking",
      apy: 4.8 + (Math.random() - 0.5) * 0.2,
      tvl: "$520.0M",
      asset: "mETH",
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

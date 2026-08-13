import { Router } from "express";
import { readChainData, getEthPrice, computeVaultPosition, VAULT_ADDRESS } from "../lib/chain.js";

const router = Router();

// Prepare a simulated SoDEX order for wallet signing
router.post("/agent/prepare-tx", async (req, res) => {
  try {
    const { action, protocol, amount, userAddress } = req.body;

    if (!userAddress) {
      res.status(400).json({ error: "userAddress required" });
      return;
    }

    const [chain, ethPrice] = await Promise.all([readChainData(), getEthPrice()]);
    const vault = computeVaultPosition(chain.totalSupplyMeth, ethPrice);

    // Prepare transaction data based on action
    const txData = {
      from: userAddress,
      to: VAULT_ADDRESS,
      value: "0x0",
      data: "0x",
      chainId: "0x21d45", // ValueChain testnet (138565)
      gasLimit: "0x30000",
    };

    // Action-specific logic
    let description = "";
    if (action?.includes("ALLOCATE")) {
      description = `Allocate ${amount} ETH to ${protocol}`;
      txData.data = `0x${Buffer.from(JSON.stringify({ action, protocol, amount })).toString("hex")}`;
    } else if (action?.includes("WITHDRAW")) {
      description = `Withdraw from ${protocol} to safety`;
    } else if (action?.includes("HOLD")) {
      description = "Hold current position — no transaction needed";
      res.json({ needsTx: false, description, vaultState: vault });
      return;
    }

    res.json({
      needsTx: true,
      mode: "simulation",
      description,
      tx: txData,
      vaultState: {
        healthFactor: vault.healthFactor,
        ethPrice: vault.ethPrice,
        totalAssets: vault.totalAssets,
      },
      explorerUrl: `https://testnet-gw.sodex.dev/address/${VAULT_ADDRESS}`,
      network: {
        name: "ValueChain Testnet",
        chainId: "0x21d45",
        rpcUrl: "https://testnet-gw.sodex.dev/api/v1/spot",
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

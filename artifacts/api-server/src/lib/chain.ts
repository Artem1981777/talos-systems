import { ethers } from "ethers";

const RPC_URL = "https://rpc.sepolia.mantle.xyz";
export const VAULT_ADDRESS = "0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7";
export const DEPLOY_BLOCK = 38074460;
export const DEPLOYER = "0x6Cc4c72634bd7284eE3239765845AC4493c9Bd11";

const METH_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export interface ChainData {
  totalSupplyMeth: number;
  blockNumber: number;
  rpcOk: boolean;
}

export interface OnChainTransfer {
  txHash: string;
  blockNumber: number;
  blockTimestamp: number;
  from: string;
  to: string;
  valueMeth: number;
  isMint: boolean;
}

let _provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
      staticNetwork: true,
    });
  }
  return _provider;
}

export async function readChainData(): Promise<ChainData> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(VAULT_ADDRESS, METH_ABI, provider);

    const [totalSupplyRaw, blockNumber] = await Promise.all([
      contract.totalSupply() as Promise<bigint>,
      provider.getBlockNumber(),
    ]);

    return {
      totalSupplyMeth: parseFloat(ethers.formatUnits(totalSupplyRaw, 18)),
      blockNumber,
      rpcOk: true,
    };
  } catch {
    return {
      totalSupplyMeth: 1000,
      blockNumber: 0,
      rpcOk: false,
    };
  }
}

export async function getEthPrice(): Promise<number> {
  const FALLBACK = 1800;

  const tryFetch = async (url: string, extract: (d: unknown) => number): Promise<number | null> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json();
      const price = extract(data);
      return Number.isFinite(price) && price > 0 ? price : null;
    } catch {
      return null;
    }
  };

  return (
    (await tryFetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      (d: any) => d?.ethereum?.usd
    )) ??
    (await tryFetch(
      "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD",
      (d: any) => d?.USD
    )) ??
    (await tryFetch(
      "https://api.kraken.com/0/public/Ticker?pair=ETHUSD",
      (d: any) => parseFloat(d?.result?.XETHZUSD?.c?.[0] ?? "0")
    )) ??
    FALLBACK
  );
}

/**
 * Fetch all Transfer events from the mETH vault contract in chunks.
 * Queries from DEPLOY_BLOCK to the latest block.
 */
export async function syncTransferEvents(fromBlock = DEPLOY_BLOCK): Promise<OnChainTransfer[]> {
  const provider = getProvider();
  const contract = new ethers.Contract(VAULT_ADDRESS, METH_ABI, provider);
  const latestBlock = await provider.getBlockNumber();

  const CHUNK = 5000;
  const events: OnChainTransfer[] = [];

  for (let start = fromBlock; start <= latestBlock; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, latestBlock);
    try {
      const logs = await contract.queryFilter("Transfer", start, end);
      for (const log of logs) {
        const e = log as ethers.EventLog;
        // Resolve block timestamp
        let blockTimestamp = 0;
        try {
          const block = await provider.getBlock(e.blockNumber);
          blockTimestamp = block?.timestamp ?? 0;
        } catch {
          blockTimestamp = 0;
        }

        const from: string = e.args[0];
        const to: string = e.args[1];
        const value: bigint = e.args[2];

        events.push({
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
          blockTimestamp,
          from,
          to,
          valueMeth: parseFloat(ethers.formatUnits(value, 18)),
          isMint: from === ethers.ZeroAddress,
        });
      }
    } catch {
      // Skip chunks that fail (rate limit, etc.)
    }
  }

  return events;
}

/**
 * Compute vault DeFi position from on-chain mETH supply and live ETH price.
 *
 * Model:
 *  - The vault holds all minted mETH as collateral (totalSupply mETH)
 *  - mETH carries a 5% staking premium over ETH
 *  - The vault borrowed stablecoins at 50% LTV when ETH was $1 800
 *  - Fixed debt = totalMeth * 1800 * 1.05 * 0.50
 *  - Health factor = (currentCollateralUsd * liquidationThreshold) / fixedDebtUsd
 *  - As ETH price rises → HF rises; as it falls → HF approaches liquidation at 1.0
 */
export function computeVaultPosition(totalMeth: number, ethPrice: number) {
  const STAKING_PREMIUM = 1.05;
  const INITIAL_ETH_PRICE = 1800;
  const BORROW_LTV = 0.50;
  const LIQUIDATION_THRESHOLD = 0.80;

  const mEthPrice = ethPrice * STAKING_PREMIUM;
  const collateralUsd = totalMeth * mEthPrice;
  const fixedDebtUsd = totalMeth * INITIAL_ETH_PRICE * STAKING_PREMIUM * BORROW_LTV;

  const healthFactor =
    fixedDebtUsd > 0
      ? (collateralUsd * LIQUIDATION_THRESHOLD) / fixedDebtUsd
      : 999;

  const apy = 8.4;

  return {
    totalAssets: totalMeth.toFixed(4),
    ethPrice: ethPrice.toFixed(2),
    mEthPrice: mEthPrice.toFixed(2),
    collateralUsd: parseFloat(collateralUsd.toFixed(2)),
    debtUsd: parseFloat(fixedDebtUsd.toFixed(2)),
    healthFactor: parseFloat(healthFactor.toFixed(4)),
    apy,
  };
}

import { ethers } from "ethers";
import fs from "fs";

// Mantle Sepolia RPC (chainId=5003)
const RPC = "https://rpc.sepolia.mantle.xyz";
const provider = new ethers.JsonRpcProvider(RPC);

async function assertMantleSepolia() {
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId);
  if (chainId !== 5003) {
    throw new Error(`Wrong network: expected Mantle Sepolia (5003), got ${chainId}`);
  }
}

// Загружаем минимальный ERC-721 ABI
const abi = JSON.parse(fs.readFileSync("contracts/abi/nft.json", "utf8"));

// Адрес NFT контракта (Mantle Sepolia)
const CONTRACT_ADDRESS = "0xc94da1ad1116fb6ab4ad7665351c1defec8b2de5";
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

(async () => {
  try {
    await assertMantleSepolia();
    console.log("NFT name:", await contract.name());
    console.log("NFT symbol:", await contract.symbol());
    console.log("Owner of token 1:", await contract.ownerOf(1));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Ошибка вызова:", message);
    process.exitCode = 1;
  }
})();

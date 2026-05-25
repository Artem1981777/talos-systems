import { ethers } from "ethers";
import fs from "fs";

// Mantle RPC
const RPC = "https://rpc.sepolia.mantle.xyz";
const provider = new ethers.JsonRpcProvider(RPC);

// Загружаем минимальный ERC-721 ABI
const abi = JSON.parse(
  fs.readFileSync("contracts/abi/nft.json", "utf8")
);

// Адрес NFT контракта
const CONTRACT_ADDRESS = "0xc94da1ad1116fb6ab4ad7665351c1defec8b2de5";

const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

(async () => {
  try {
    console.log("NFT name:", await contract.name());
    console.log("NFT symbol:", await contract.symbol());
    console.log("Owner of token 1:", await contract.ownerOf(1));
  } catch (err) {
    console.error("Ошибка вызова:", err.message);
  }
})();


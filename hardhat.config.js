import "dotenv/config";

/** @type {import("hardhat/config").HardhatUserConfig} */
export default {
  solidity: "0.8.24",
  defaultNetwork: "mantleSepolia",
  networks: {
    mantleSepolia: {
      url: process.env.MANTLE_SEPOLIA_RPC_URL || "",
      chainId: 5003,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts/hardhat",
    cache: "./cache/hardhat",
  },
};

const dotenv = require("dotenv");
dotenv.config();

require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

// Use a default test private key if none is provided or if it's invalid
const PRIVATE_KEY = process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here' && process.env.PRIVATE_KEY.length === 66
  ? process.env.PRIVATE_KEY
  : "0x0000000000000000000000000000000000000000000000000000000000000001";

const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    // Cronos Mainnet
    cronos: {
      url: process.env.CRONOS_RPC_URL || "https://evm.cronos.org",
      accounts: [PRIVATE_KEY],
      chainId: 25,
    },
    // Cronos Testnet
    cronosTestnet: {
      url: process.env.CRONOS_TESTNET_RPC_URL || "https://evm-t3.cronos.org",
      accounts: [PRIVATE_KEY],
      chainId: 338,
    },
    // Keep Monad for backwards compatibility
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet.monad.xyz",
      accounts: [PRIVATE_KEY],
      chainId: 41454,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    require: ['ts-node/register']
  },
  etherscan: {
    apiKey: {
      cronos: process.env.CRONOSCAN_API_KEY || "",
      cronosTestnet: process.env.CRONOSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://api.cronoscan.com/api",
          browserURL: "https://explorer.cronos.org",
        },
      },
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL: "https://api-testnet.cronoscan.com/api",
          browserURL: "https://explorer.cronos.org/testnet",
        },
      },
    ],
  },
};

module.exports = config;

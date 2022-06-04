import { HardhatUserConfig } from "hardhat/types";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "solidity-coverage";
import "dotenv/config";

const private_key = process.env.PRIVATE_KEY || "0x..";
const rinkeby_rpc = process.env.RPC_URL_RINKEBY || "https:// ....";
const mainnet_rpc = process.env.RPC_URL_MAINNET || "https:// ....";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.7",
  },
  networks: {
    hardhat: {
      // forking: {
      //   url: mainnet_rpc,
      // },
    },
    rinkeby: {
      url: rinkeby_rpc,
      accounts: [private_key],
    },
    mainnet: {
      url: mainnet_rpc,
      accounts: [private_key],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0,
    },
  },
  paths: {
    sources: "src",
  },
  mocha: {
    timeout: 200000,
  },
};
export default config;

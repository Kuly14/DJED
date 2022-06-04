import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Address, DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";

const deployICO: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  const SHEN = await get("Shen");

  let feedAddress: Address;
  let wbtcAddress: Address;

  if (network.name == "mainnet") {
    feedAddress = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";
    wbtcAddress = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
  } else if (network.name == "rinkeby") {
    feedAddress = "0xECe365B379E1dD183B20fc5f022230C044d51404";
    wbtcAddress = "0x577D296678535e4903D59A4C929B718e1D575e0A";
  } else {
    await deploy("AggregatorV3Mock", {
      from: deployer,
      args: [],
      log: true,
    });
    const AggregatorMock = await get("AggregatorV3Mock");
    feedAddress = AggregatorMock.address;

    await deploy("MockWBTC", {
      from: deployer,
      args: [],
      log: true,
    });

    const WbtcMock = await get("MockWBTC");
    wbtcAddress = WbtcMock.address;
  }

  await deploy("ShenICO", {
    from: deployer,
    args: [feedAddress, SHEN.address, wbtcAddress],
    log: true,
  });

  const ico = await get("ShenICO");

  const shen = await ethers.getContract("Shen", deployer);
  await shen.mint(ico.address, ethers.utils.parseEther("10000000"));
};
export default deployICO;
deployICO.tags = ["ico", "all", "first"];

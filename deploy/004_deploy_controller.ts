import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Address, DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";

const deployController: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  const DJED = await get("Djed");
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

  await deploy("Controller", {
    from: deployer,
    args: [feedAddress, DJED.address, SHEN.address, wbtcAddress],
    log: true,
  });

  const djed = await ethers.getContract("Djed", deployer);
  const shen = await ethers.getContract("Shen", deployer);
  const cont = await ethers.getContract("Controller", deployer);
  const ico = await ethers.getContract("ShenICO", deployer);
  if (network.name == "mainnet") {
    // We send the WBTC from the ico to the Controller so users can start mint DJED and SHEN.
    const transfer_tx = await ico.transferWBTC(cont.address);
    await transfer_tx.wait();
  }

  // We transfer ownership to the Controller address so it can mint tokens and we don't have any control over it.
  await djed.transferOwnership(cont.address);
  await shen.transferOwnership(cont.address);
};
export default deployController;
deployController.tags = ["Controller", "all", "second"];

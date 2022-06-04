import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const deployDJED: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const symbol = "DJD";
  const name = "DJED";

  await deploy("Djed", {
    from: deployer,
    args: [name, symbol],
    log: true,
  });

  const djed = await ethers.getContract("Djed", deployer);
  await djed.mint(deployer, ethers.utils.parseEther("10"));
};
export default deployDJED;
deployDJED.tags = ["djed", "all", "first"];

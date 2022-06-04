import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploySHEN: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const symbol = "SHN";
  const name = "SHEN";

  await deploy("Shen", {
    from: deployer,
    args: [name, symbol],
    log: true,
  });
};
export default deploySHEN;
deploySHEN.tags = ["shen", "all", "first"];

import { assert, expect } from "../chai-setup";
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
  network,
} from "hardhat";
import { setupUsers, setupUser } from "../utils/index";
import { parse } from "../utils/parseEther";

async function setup() {
  await deployments.fixture(["first"]);

  const contracts = {
    ico: await ethers.getContract("ShenICO"),
  };

  const { deployer } = await getNamedAccounts();

  const users = await setupUsers(await getUnnamedAccounts(), contracts);

  return {
    ...contracts,
    users,
    deployer: await setupUser(deployer, contracts),
  };
}

if (network.name == "hardhat" || network.name == "mainnet") {
  describe("StableCoin Tests", () => {
    it("Should test if the price feed works correctly ICO", async () => {
      const { ico, deployer } = await setup();

      const price_tx = await ico.getPrice();

      expect(price_tx).is.gt(parse("28000"));
      assert.equal(deployer.address, await ico.owner());
    });
  });
} else {
  describe.skip;
}

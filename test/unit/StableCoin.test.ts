import { expect } from "../chai-setup";
import { Contract } from "ethers";
import { ethers, deployments } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { parse } from "../utils/parseEther";
import { moveTime } from "../utils/move-time";

describe("Djed Tests", () => {
  let djed: Contract;
  let shen: Contract;
  let cont: Contract;
  let ico: Contract;
  let wbtc: Contract;
  let feed: Contract;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  before(async () => {
    await deployments.fixture(["all"]);
    [user, user2, user3] = await ethers.getSigners();

    djed = await ethers.getContract("Djed");
    shen = await ethers.getContract("Shen");
    cont = await ethers.getContract("Controller");
    ico = await ethers.getContract("ShenICO");
    wbtc = await ethers.getContract("MockWBTC");
    feed = await ethers.getContract("AggregatorV3Mock");

    const mintWbtc_tx1 = await wbtc.mint(user.address, parse("100000"));
    await mintWbtc_tx1.wait();
    const mintWbtc_tx2 = await wbtc.mint(user2.address, parse("100000"));
    await mintWbtc_tx2.wait();
    const mintWbtc_tx3 = await wbtc.mint(user3.address, parse("100000"));
    await mintWbtc_tx3.wait();
  });

  describe("StableCoin Workflow", () => {
    it("Should complete the ico", async () => {
      const approve_tx1 = await wbtc
        .connect(user)
        .approve(ico.address, parse("10000000000000"));
      const approve_tx2 = await wbtc
        .connect(user2)
        .approve(ico.address, parse("10000000000000"));
      const approve_tx3 = await wbtc
        .connect(user3)
        .approve(ico.address, parse("10000000000000"));

      const buyShen_tx1 = await ico.connect(user).buyShenICO(parse("10000"));
      await buyShen_tx1.wait();
      const buyShen_tx2 = await ico.connect(user2).buyShenICO(parse("50000"));
      await buyShen_tx2.wait();
      const buyShen_tx3 = await ico.connect(user3).buyShenICO(parse("100000"));
      await buyShen_tx3.wait();

      expect(await shen.balanceOf(user.address)).to.equal(parse("10000"));
      expect(await shen.balanceOf(user2.address)).to.equal(parse("50000"));
      expect(await shen.balanceOf(user3.address)).to.equal(parse("100000"));
    });

    it("Should move the time and end ICO", async () => {
      await expect(ico.transferWBTC(cont.address)).to.be.revertedWith(
        "ICO: ICO didn't end"
      );

      await moveTime(604900);

      const icoBalance = await wbtc.balanceOf(ico.address);

      const endIco_tx = await ico.transferWBTC(cont.address);
      await endIco_tx.wait();

      expect(await wbtc.balanceOf(cont.address)).to.equal(icoBalance);
    });

    it("Should buy djed", async () => {
      const approve_tx1 = await wbtc
        .connect(user)
        .approve(cont.address, parse("100000000000000000"));
      const approve_tx2 = await wbtc
        .connect(user2)
        .approve(cont.address, parse("100000000000000000"));

      const approve_tx3 = await wbtc
        .connect(user3)
        .approve(cont.address, parse("100000000000000000"));

      const buyDjed_tx1 = await cont.connect(user).buyDjed(parse("100000"));
      await buyDjed_tx1.wait();

      const buyDjed_tx2 = await cont.connect(user2).buyDjed(parse("100000"));
      await buyDjed_tx2.wait();

      const buyDjed_tx3 = await cont.connect(user3).buyDjed(parse("30000"));
      await buyDjed_tx3.wait();

      await expect(
        cont.connect(user).buyDjed(parse("1000000"))
      ).to.be.revertedWith("CONTROLLER: Low Reserves");

      await expect(cont.connect(user).buyDjed(parse("10")))
        .to.emit(cont, "DjedBough")
        .withArgs(user.address, parse("10"));

      await expect(cont.connect(user).buyDjed(parse("0.1"))).to.be.revertedWith(
        "CONTROLLER: Not Enough DJED"
      );

      // Plus 10 from event test and plus 10 from deployment
      expect(await djed.balanceOf(user.address)).to.equal(parse("100020"));
      expect(await djed.balanceOf(user2.address)).to.equal(parse("100000"));
      expect(await djed.balanceOf(user3.address)).to.equal(parse("30000"));
    });

    it("Should check if the ratio is correct", async () => {
      const wbtcBalance = await wbtc.balanceOf(cont.address);
      const dollarAmount = wbtcBalance.mul(parse("30000"));
      const djedSupp = await cont.djedSupply();
      const ratio = dollarAmount.div(djedSupp);

      expect(await cont.getRatio()).to.equal(ratio);
    });

    it("Should buy shen", async () => {
      const buyShen_tx1 = await cont.buyShen(parse("100000"));
      await buyShen_tx1.wait();

      const buyShen_tx2 = await cont.connect(user2).buyShen(parse("10000"));
      await buyShen_tx2.wait();

      const buyShen_tx3 = await cont.connect(user3).buyShen(parse("10000"));
      await buyShen_tx3.wait();

      expect(await shen.balanceOf(user.address)).to.equal(
        parse("100000").add(parse("10000"))
      );

      expect(await shen.balanceOf(user2.address)).to.equal(
        parse("10000").add(parse("50000"))
      );

      expect(await shen.balanceOf(user3.address)).to.equal(
        parse("10000").add(parse("100000"))
      );

      await expect(cont.buyShen(parse("100000"))).to.be.revertedWith(
        "CONTROLLER: High Reserves"
      );

      await expect(cont.connect(user).buyShen(parse("10")))
        .to.emit(cont, "ShenBought")
        .withArgs(user.address, parse("10"));
    });

    it("Should check if the ratio is correct", async () => {
      const wbtcBalance = await wbtc.balanceOf(cont.address);
      const dollarAmount = wbtcBalance.mul(parse("30000"));
      const djedSupp = await cont.djedSupply();
      const ratio = dollarAmount.div(djedSupp);

      expect(await cont.getRatio()).to.equal(ratio);
    });

    it("Should drop the btc price", async () => {
      const changePrice_tx = await feed.changeRoundData("1000000000000");
      await changePrice_tx.wait();

      // latestRoundData returns multiple vars so we need add them in.
      expect((await feed.latestRoundData()).toString()).to.equal(
        "0,1000000000000,0,0,0"
      );
    });

    it("Should check if the ratio is correct", async () => {
      const wbtcBalance = await wbtc.balanceOf(cont.address);
      const dollarAmount = wbtcBalance.mul(parse("10000"));
      const djedSupp = await cont.djedSupply();
      const ratio = dollarAmount.div(djedSupp);

      expect(await cont.getRatio()).to.equal(ratio);
    });
    it("Should check if djed price is still stable", async () => {
      expect(await cont.djedPrice()).to.equal(parse("1"));
    });

    it("Should not be able to sell shen and buy djed", async () => {
      await shen.connect(user).approve(cont.address, parse("1000000000000"));

      await expect(
        cont.connect(user).sellShen(parse("1000"))
      ).to.be.revertedWith("CONTROLLER: Low Reserves");

      await expect(cont.buyDjed(parse("1000"))).to.be.revertedWith(
        "CONTORLLER: Low Reserves"
      );
    });

    it("Should buy enough shen to restore the ratio", async () => {
      const shenBalance = await shen.balanceOf(user.address);

      const buyShen_tx1 = await cont.connect(user).buyShen(parse("500000"));
      await buyShen_tx1.wait();

      expect(await shen.balanceOf(user.address)).to.equal(
        shenBalance.add(parse("500000"))
      );
    });

    it("Should increase the price of wbtc", async () => {
      const changePrice_tx = await feed.changeRoundData("6000000000000");
      await changePrice_tx.wait();

      // latestRoundData returns multiple vars so we need add them in.
      expect((await feed.latestRoundData()).toString()).to.equal(
        "0,6000000000000,0,0,0"
      );
    });
    it("Should check if the ratio is correct", async () => {
      const wbtcBalance = await wbtc.balanceOf(cont.address);
      const dollarAmount = wbtcBalance.mul(parse("60000"));
      const djedSupp = await cont.djedSupply();
      const ratio = dollarAmount.div(djedSupp);

      expect(await cont.getRatio()).to.equal(ratio);
    });

    it("Should sell shen to make the ratio lower", async () => {
      const balance = await shen.balanceOf(user.address);
      const sellShen_tx = await cont.connect(user).sellShen(balance);
      await sellShen_tx.wait();

      // Ratio is now at 6.45... so we need to sell some more to get to 3.0000

      const approve_tx = await shen
        .connect(user2)
        .approve(cont.address, parse("10000000000000"));
      await approve_tx.wait();

      const approve_tx3 = await shen
        .connect(user3)
        .approve(cont.address, parse("1000000000000000"));
      await approve_tx3.wait();

      const balance2 = await shen.balanceOf(user2.address);
      const sellShen_tx2 = await cont.connect(user2).sellShen(balance2);
      await sellShen_tx2.wait();

      const balance3 = await shen.balanceOf(user3.address);
      const sellShen_tx3 = await cont
        .connect(user3)
        .sellShen(balance3.div("3"));
      await sellShen_tx3.wait();

      await expect(
        cont.connect(user3).sellShen(balance3.div("3"))
      ).to.be.revertedWith("CONTROLLER: Low Reserves");
    });

    it("Should decrease the price so it looses ", async () => {
      const changePrice_tx2 = await feed.changeRoundData("1000000000000");
      await changePrice_tx2.wait();

      // latestRoundData returns multiple vars so we need add them in.
      expect((await feed.latestRoundData()).toString()).to.equal(
        "0,1000000000000,0,0,0"
      );
    });
    it("Should sell djed", async () => {
      // Ratio is now at only 50% so for 1 djed you receive only 55 cents

      const approve_tx1 = await djed
        .connect(user)
        .approve(cont.address, parse("1000000000"));

      const approve_tx2 = await djed
        .connect(user2)
        .approve(cont.address, parse("1000000000"));

      const approve_tx3 = await djed
        .connect(user3)
        .approve(cont.address, parse("1000000000"));

      // Even though the peg is lost djed holders have priority and they can withdraw.
      // Shen holders can't. They can only buy. But for a good price in this case 1$.

      const sellDjed_tx = await cont.connect(user).sellDjed(parse("90000"));
      const sellDjed_tx2 = await cont.connect(user2).sellDjed(parse("90000"));
      const sellDjed_tx3 = await cont.connect(user3).sellDjed(parse("10000"));

      await expect(
        cont.connect(user3).sellShen(parse("10000"))
      ).to.be.revertedWith("CONTROLLER: Low Reserves");

      await expect(
        cont.connect(user).buyDjed(parse("1000"))
      ).to.be.revertedWith("CONTORLLER: Low Reserves");
    });

    it("Should check price feed", async () => {
      const price_tx = await cont.getPrice();

      expect(price_tx).is.gt(parse("8000"));
    });
  });
});

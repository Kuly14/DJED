# DJED - A Formally Verified Crypto-Backed Pegged Algorithmic Stablecoin

This is a Solidity implementation of this beautiful paper from IOHK: https://eprint.iacr.org/2021/1069.pdf

We use WBTC as the Base Coin, DJED as the Stable Coin and SHEN as the Reserve Coin.

## To deploy

First we deploy Djed, Shen and the ICO. The script automatically mints shen for the ico. It will mint 10 000 000 tokens and the price is set to 4.5$ during the ico.

```bash 
yarn hardhat --network mainnet deploy --tags first
```

After the ICO is over. If you deploy before the ICO is over the transfer_tx won't go through and you will have to do it manually.

```bash
yarn hardhat --network mainnet deploy --tags second
```

This will deploy the controller, transfer the WBTC from the ICO and transfers ownership of the tokens to the controller.

# DJED - A Formally Verified Crypto-Backed Pegged Algorithmic Stablecoin

This is a Solidity implementation of this beautiful paper from IOHK: https://eprint.iacr.org/2021/1069.pdf

## To deploy

First we deploy Djed, Shen and the ICO. The script automatically mints shen for the ico.

```bash 
yarn hardhat --network mainnet deploy --tags first
```

After the ICO is over. If you deploy before the ICO is over the transfer_tx won't go through and you will have to do it manually.

```bash
yarn hardhat --network mainnet deploy --tags second
```

This will deploy the controller, transfer the WBTC from the ICO and transfers ownership of the minting to the controller.

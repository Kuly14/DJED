# DJED - A Formally Verified Crypto-Backed Pegged Algorithmic Stablecoin

This is a Solidity implementation of this beautiful paper from IOHK: https://eprint.iacr.org/2021/1069.pdf

We use WBTC as the Base Coin, DJED as the Stable Coin and SHEN as the Reserve Coin.

Because Bitcoin is not as volatile as other coins I moved the rmax to 700% and rmin to 300%

This will help a lot because it will be pretty hard to find enough willing buyers of the Reserve Coin.


## To install

Clone this repo
```bash
git clone https://github.com/Kuly14/DJED.git
```

Install dependencies

```bash
yarn
```

Create .env file and specify your Rinkeby Rpc Url, Mainnet Rpc Url and your Private key.

## To test

After installing dependencies run

```bash
yarn hardhat test
```

## Coverage

To run solidity-coverage

```bash
yarn hardhat coverage
```


## To deploy to mainnet

First we deploy Djed, Shen and the ICO. The script automatically mints shen for the ico. It will mint 10 000 000 tokens and the price is set to 4.5$ during the ico.

```bash 
yarn hardhat --network mainnet deploy --tags first
```

After the ICO is over deploy the main controller that the users will interact with. If you deploy before the ICO is over the transfer_tx won't go through and you will have to do it manually.

```bash
yarn hardhat --network mainnet deploy --tags second
```

This will deploy the controller, transfer the WBTC from the ICO and transfers ownership of the tokens to the controller.


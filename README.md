# Package for Launching a New LSP

The purpose of this repository/package is to make it easy to customize your LSP (Long-Short Pair) deployment. Feel free to use this repository in place or fork and customize it.

For more information on the LSP, [read the docs](https://umaproject.org/lsp.html).

This launch repo currently is only for Kovan and Mumbai testnet LSP deployments. This will soon be updated to include Ethereum mainnet and Polygon deployments.

## Install system dependencies

You will need to install nodejs v14 and yarn.

Note: these additional dependencies are required -- you may or may not have them on your system already:

- `libudev`
- `libusb`

These dependencies are installed on MacOSX by installing the XCode Developer Tools. For Linux, the example Ubuntu installation command for additional dependencies is:

```bash
sudo apt-get update && sudo apt-get install -y libudev-dev libusb-1.0-0-dev
```

## Install packages

```bash
yarn
```

## Run the deployment script

Before running this command, you should customize the parameters to your needs. `YOUR_NODE_URL` should be filled in with a url for the network that you wish to deploy to and the `lspCreatorAddress` value should be substituted with the creator address on that same network. These creator addresses can be found in the `Contract Addresses` section. It is prefilled with the Ethereum mainnet `LongShortPairCreator` address.

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$4-12 Range Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$4-12 Range Token August 2021" --longSynthSymbol rtUMA-0821 --shortSynthName "UMA \$4-12 Range Short Token August 2021" --shortSynthSymbol rtUMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --customAncillaryData "twapLength:3600" --fpl RangeBond --lowerBound 4000000000000000000 --upperBound 12000000000000000000
```

## Customize your deployment parameters

You can customize all of the deployment parameters of the LSP simply by changing the parameters that you pass in the run command above. See [the script](./index.js) or [documentation](https://docs.umaproject.org/synthetic-tokens/long-short-pair#lsp-construction-parameters) for more details about these parameters.

Your financial product library address will defines the payout function for your LSP. We have several [financial product libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries) available for transforming the price, identifier, or collateral requirement of an LSP before or after expiry.

How and when to use various libraries is explained below.

### Binary Option

Binary options settle with all collateral allocated to either the long or short side, depending on the settlement price. They can be used to make prediction markets or any kind of binary bet. Settlement is defined using a strike price which informs which side of the bet was correct. If settlement price is greater or equal to the strike then all value is sent to the long side. Otherwise, all value is sent to the short side. The settlement price could be a scalar (like the price of ETH) or a binary bet with settlement being 0 or 1 depending on the outcome.

Specify this library with the flag `--fpl BinaryOption`.

TODO: Explain how to set library parameters on Etherscan.

### Covered Call

The contract will payout a scaled amount of collateral depending on where the settlement price lands relative to the call's strike price. If the settlement is below the strike price then longs expire worthless. If the settlement is above the strike then the payout is the fraction above the strike defined by `(expiryPrice - strikePrice) / expiryPrice`.

For example, consider a covered call option collateralized in ETH, with a strike a price of 3000.

 * If the price is less than 3000 then the each long is worth 0 and each short is worth collateralPerPair.
 * If the price is more than 3000 then each long is worth the fraction of collateralPerPair that was in the money and each short is worth the remaining collateralPerPair.
 * Say settlement price is 3500.  Then `expiryPercentLong = (3500 - 3000) / 3500 = 0.143`. The value of this 0.143 ETH is worth `0.143*3500=500` which is the percentage of the collateralPerPair that was above the strike price.

Specify this library with the flag `--fpl CoveredCall`.

TODO: Explain how to set library parameters on Etherscan.

### Linear

The contract will payout a scaled amount of collateral depending on where the settlement price lands within a price range between an upperBound and a lowerBound. If settlement price is within the price range then the expiryPercentLong is defined by ``(expiryPrice - lowerBound) / (upperBound - lowerBound)``.

This number represent the amount of collateral from the collateralPerPair that will be sent to the long and short side. If the price is higher than the upperBound then expiryPercentLong = 1. if the price is lower than the lower bound then expiryPercentLong = 0.

For example, consider a linear LSP on the price of ETH collateralized in USDC with an upperBound = 4000 and lowerBound = 2000 with a collateralPerPair of 1000 (i.e each pair of long and shorts is worth 1000 USDC).

At settlement the expiryPercentLong would equal 1 (each long worth 1000 and short worth 0) if ETH price was > 4000 and it would equal 0 if < 2000 (each long is worthless and each short is worth 1000). If between the two (say 3500) then `expiryPercentLong = (3500 - 2000) / (4000 - 2000) = 0.75`. Therefore each long is worth 750 and each short is worth 250.

Specify this library with the flag `--fpl Linear`.

TODO: Explain how to set library parameters on Etherscan.

### Range Bond
A range bond is the combination of a Yield dollar, short put option and long call option enabling the token sponsor to issue structured products to unlock DeFi treasuries.

A range bond is defined as equal to a Yield Dollar - Put Option + Call option. Numerically this is found using:
 * N = Notional of bond
 * P = price of token
 * T = number of tokens
 * R1 = low price range
 * R2 = high price range
 * T = min(N/P,N/R1) + max((N/R2*(P-R2))/P,0)

At any price below the low price range (R1) the long side effectively holds a fixed number of collateral equal to `collateralPerPair` from the LSP with the value of expiryPercentLong = 1. This is the max payout in collateral.

Any price between R1 and R2 gives a payout equivalent to a yield dollar (bond) of notional N. In this range the `expiryPercentLong` shifts to keep the payout in dollar terms equal to the bond notional.

At any price above R2 the long holders are entitled to a fixed, minimum number of collateral equal to N/R2 with a `expiryPercentLong=(N/R2)/collateralPerPair`.

The expression for the number of tokens paid out to the long side (T above) can be algebraically simplified, transformed to remove the notional and reframed to express the expiryPercentLong as ``[min(max(1/R2,1/P),1/R1)]/(1/R1)``

With this equation, the contract deployer does not need to specify the bond notional N. The notional can be calculated by taking `R1*collateralPerPair` from the LSP.

Specify this library with the flag `--fpl RangeBond`.

When deploying the Range Bond, you should set `collateralPerPair` to `R1/N`.

For example, if the low price in the range is `$4` and the notional of the bond is `$1`, you should set `collateralPerPair` to `0.25` (`250000000000000000`, with 1e18 decimals).

If the low price in the range is `$2` and the notional of the bond is `$100`, you should set `collateralPerPair` to `50` (`50000000000000000000`, with 1e18 decimals).

After deploying the Range Bond, you must separately call `setLongShortPairParameters` on the library contract, which you can do on Etherscan or PolygonScan. Set `longShortPair` to your deployed Range Bond address, `highPriceRange` to your high price range (with 1e18 decimals), and `lowPriceRange` to your low price range (with 1e18 decimals).

### New Libraries

In some cases, you may find yourself in need of a custom financial product library for your use case. If so, please see the `Deploying new financial product libraries`. The address of the custom financial product library can be specified with the `--financialProductLibraryAddress` flag.

## Deploying new financial product libraries

If you wish to deploy your own financial product library, fork the [protocol repo](https://github.com/UMAprotocol/protocol) and add your `CustomFinancialProductLibrary` Solidity file to [/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries). You will probably want a different name for your library, but this is an example!

Then take the following steps to deploy and verify the contract with Hardhat.

1. In the protocol repo, run `yarn` and `yarn build`.
2. Add your MetaMask mnemonic to your environment with `export MNEMONIC=your mnemonic string` or through an environment file.
3. From `core`, run `yarn hardhat console --network mainnet`.
4. From the Hardhat console, run `deployments.deploy("CustomFinancialProductLibrary", { from: "0xYOURADDRESS" }).then(console.log)`
5. Make a note of the address of your newly deployed Financial Product Library.
6. OPTIONAL: To verify your contract on Etherscan, exit the Hardhat console, and run `CUSTOM_NODE_URL=https://your.node.url ETHERSCAN_API_KEY=YOUR_KEY yarn hardhat verify 0xDEPLOYED_FPL_ADDRESS --network mainnet`

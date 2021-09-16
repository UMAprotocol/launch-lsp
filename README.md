# Package for Launching a New LSP

The purpose of this repository/package is to make it easy to customize your LSP (Long-Short Pair) deployment. Feel free to use this repository in place or fork and customize it.

For more information on the LSP, [read the docs](https://docs.umaproject.org/synthetic-tokens/long-short-pair).

This launch repo currently supports LSP deployments on Mumbai testnet, Polygon, Kovan testnet and Ethereum Mainnet.

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

For each financial product library below, a description and example deployment script have been created to be used as a reference. Before running the deployment script command, you should customize the parameters to your needs. `YOUR_NODE_URL` should be filled in with a node url for the network that you wish to deploy to. 

## Customize your deployment parameters

You can customize all of the deployment parameters of the LSP simply by changing the parameters that you pass in the run command. See [the script](./index.js) or [documentation](https://docs.umaproject.org/synthetic-tokens/long-short-pair#lsp-construction-parameters) for more details about these parameters.

*Mandatory arguments:*
```
--url: node url for the network you wish to deploy to. 
--mnemonic: an account mnemonic you'd like to use. The script will default to using the node's unlocked accounts.
--gasprice: Gas price to use in GWEI.
--expirationTimestamp: Timestamp that the contract will expire at.
--collateralPerPair: How many units of collateral are required to mint one pair of synthetic tokens.
--priceIdentifier: The approved price identifier to be used.
--pairName: The desired name of the token pair.
--longSynthName: The full-length name of the long token.
--longSynthSymbol: Long token symbol.
--shortSynthName: The full-length name of the short token.
--shortSynthSymbol: Short token symbol.
--collateralToken: Approved collateral currency to be used.
```

*Optional arguments:*
```
--fpl: Name of the financial product library type your contract will use to calculate the payment at expiry, such as RangeBond or Linear. Required if --financialProductLibraryAddress is not included.
--financialProductLibraryAddress: Contract address providing settlement payout logic. Only required if a custom financial product library is used and --fpl is not included.
--customAncillaryData: Custom ancillary data to be passed along with the price request. If not needed, this flag can be excluded and will be left as a 0-length bytes array.
--prepaidProposerReward: Proposal reward to be forwarded to the created contract to be used to incentivize price proposals.
--optimisticOracleLivenessTime: Custom liveness window for disputing optimistic oracle price proposals in seconds. A longer liveness time provides more security, while a shorter one provides faster settlement. By default, this is set to 7200 seconds.
--optimisticOracleProposerBond: Additional bond proposer must post with the optimistic oracle. A higher bond makes incorrect disputes and proposals more costly.
--strikePrice: Alias for lowerBound, used for certain financial product libraries with no upper bound. Cannot be included if --lowerBound is specified.
--basePercentage: The percentage of collateral per pair used as the floor. This parameter is used with the 'SuccessToken' fpl where the remaining percentage functions like an embedded call option.
--lowerBound: Lower bound of a price range for certain financial product libraries. Cannot be included if --strikePrice is specified.
--upperBound: Upper bound of a price range for certain financial product libraries.
--simulate: Boolean telling if the script should only simulate the transactions without sending them to the network.
```

Your financial product library address defines the payout function for your LSP. We have several [financial product libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries) available for transforming the price, identifier, or collateral requirement of an LSP before or after expiry.

How and when to use various libraries is explained below.

### Binary Option

Binary options settle with all collateral allocated to either the long or short side, depending on the settlement price. They can be used to make prediction markets or any kind of binary bet. Settlement is defined using a strike price which informs which side of the bet was correct. If the settlement price is greater or equal to the strike then all value is sent to the long side. Otherwise, all value is sent to the short side. The settlement price could be a scalar (like the price of ETH) or a binary bet with settlement being 0 or 1 depending on the outcome.

Specify this library with the flag `--fpl BinaryOption`. To set the fpl parameters for `BinaryOption`, use `--strikePrice` as shown in the example deployment script below:

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$12 Binary Option Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$12 Binary Option Token August 2021" --longSynthSymbol UMA-0821 --shortSynthName "UMA \$12 Binary Option Short Token August 2021" --shortSynthSymbol UMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --fpl BinaryOption --strikePrice 12000000000000000000 --prepaidProposerBond 20000000000000000000 --optimisticOracleProposerBond 40000000000000000000
```

### Covered Call

The contract will payout a scaled amount of collateral depending on where the settlement price lands relative to the call's strike price. If the settlement is below the strike price then longs expire worthless. If the settlement is above the strike then the payout is the fraction above the strike defined by `(expiryPrice - strikePrice) / expiryPrice`.

For example, consider a covered call option collateralized in ETH, with a strike price of 3000.

 * If the price is less than 3000 then each long is worth 0 and each short is worth collateralPerPair.
 * If the price is more than 3000 then each long is worth the fraction of collateralPerPair that was in the money and each short is worth the remaining collateralPerPair.
 * Say settlement price is 3500.  Then `expiryPercentLong = (3500 - 3000) / 3500 = 0.143`.

Specify this library with the flag `--fpl CoveredCall`. To set the fpl parameters for `CoveredCall`, use `--strikePrice` as shown in the example deployment script below:

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$12 Covered Call Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$12 Covered Call Token August 2021" --longSynthSymbol UMA-0821 --shortSynthName "UMA \$12 Covered Call Short Token August 2021" --shortSynthSymbol UMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --fpl CoveredCall --strikePrice 12000000000000000000 --prepaidProposerBond 20000000000000000000 --optimisticOracleProposerBond 40000000000000000000
```

### Linear

The linear fpl contract will payout a scaled amount of collateral depending on where the settlement price lands within a price range between an upperBound and a lowerBound. If the settlement price is within the price range then the expiryPercentLong is defined by ``(expiryPrice - lowerBound) / (upperBound - lowerBound)``.

This number represents the amount of collateral from the collateralPerPair that will be sent to the long and short side. If the price is higher than the upperBound then expiryPercentLong = 1. if the price is lower than the lower bound then expiryPercentLong = 0.

For example, consider a linear LSP on the price of ETH collateralized in USDC with an upperBound = 4000 and lowerBound = 2000 with a collateralPerPair of 1000 (i.e each pair of long and shorts is worth 1000 USDC).

At settlement, the expiryPercentLong would equal 1 (each long worth 1000 and short worth 0) if ETH price was > 4000 and it would equal 0 if < 2000 (each long is worthless and each short is worth 1000). If between the two (say 3500) then `expiryPercentLong = (3500 - 2000) / (4000 - 2000) = 0.75`. Therefore each long is worth 750 and each short is worth 250.

Specify this library with the flag `--fpl Linear`. To set the fpl parameters for `Linear`, use `--lowerBound` and `--upperBound` as shown in the example deployment script below:

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$4-12 Linear Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$4-12 Linear Token August 2021" --longSynthSymbol UMA-0821 --shortSynthName "UMA \$4-12 Linear Short Token August 2021" --shortSynthSymbol UMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --fpl Linear --lowerBound 4000000000000000000 --upperBound 12000000000000000000 --prepaidProposerBond 20000000000000000000 --optimisticOracleProposerBond 40000000000000000000
```

### Range Token

A range token is the combination of a yield dollar, short put option and long call option enabling the token sponsor to issue structured products to unlock DeFi treasuries.

A range token is defined as equal to a Yield Dollar - Put Option + Call Option. Numerically this is found using:
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

When deploying the range token, you should set `collateralPerPair` to `R1/N`.

For example, if the low price in the range is `$4` and the notional of the bond is `$1`, you should set `collateralPerPair` to `0.25` (`250000000000000000`, with 1e18 decimals).

If the low price in the range is `$2` and the notional of the bond is `$100`, you should set `collateralPerPair` to `50` (`50000000000000000000`, with 1e18 decimals).

Specify this library with the flag `--fpl RangeBond`. To set the fpl parameters for `RangeBond`, use `--lowerBound` and `--upperBound` as shown in the example deployment script below:

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$4-12 Range Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$4-12 Range Token August 2021" --longSynthSymbol rtUMA-0821 --shortSynthName "UMA \$4-12 Range Short Token August 2021" --shortSynthSymbol rtUMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --fpl RangeBond --lowerBound 4000000000000000000 --upperBound 12000000000000000000 --prepaidProposerBond 20000000000000000000 --optimisticOracleProposerBond 40000000000000000000
```

### Capped Yield Dollar

A capped yield dollar is similar to a range token except it does not have the embedded call option. The combination of a yield dollar and short put option enables the token sponsor to issue structured products to unlock DeFi treasuries.

A capped yield dollar is defined as equal to a Yield Dollar - Put Option. For the capped yield dollar to be fully collateralized and non-liquidatable, there is a low price for the collateral token below which the capped yield dollar will be worth < $1. Numerically this is found using:
 * N = Notional of bond
 * P = price of token
 * T = number of tokens
 * R1 = low price range
 * C = collateral per pair, should be N/R1
 * T = min(1,(R1/P)*C)
 * If you want a yield dollar denominated as N = $1, you should set C to 1/R1. In that case, T = min(1,1/P).

- At any price below the low price range (R1) the long side effectively holds a fixed number of collateral equal to collateralPerPair from the LSP with the value of expiryPercentLong = 1. This is the max payout in collateral.
- At any price equal to or above R1 gives a payout equivalent to a yield dollar (bond) of notional N. In this range the expiryPercentLong shifts to keep the payout in dollar terms equal to the bond notional.

With this equation, the contract deployer does not need to specify the bond notional N. The notional can be calculated by taking R1*collateralPerPair from the LSP.

Specify this library with the flag `--fpl CappedYieldDollar`. To set the fpl parameters for `CappedYieldDollar`, use `--lowerBound` as shown in the example deployment script below:

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$4 Capped Yield Dollar Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$4 Capped Yield Dollar Token August 2021" --longSynthSymbol UMA-0821 --shortSynthName "UMA \$4 Capped Yield Dollar Short Token August 2021" --shortSynthSymbol UMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --fpl CappedYieldDollar --lowerBound 4000000000000000000 --prepaidProposerBond 20000000000000000000 --optimisticOracleProposerBond 40000000000000000000
```

### Success Token

A success token pays out a fixed amount of collateral as a floor, with the remaining amount functioning like an embedded option. The embedded option in this case uses payout logic that resembles a covered call. I.e., the token expires to be worth: 

basePercentage + (1 - basePercentage) * (expiryPrice - strikePrice)

The `basePercentage` parameter is the percentage of collateral per pair used as the floor. If this value was set to 40%, then 40% of the success token would act as collateral with 60% functioning as an embedded covered call.

As an example, consider a success token collateralized with UMA and `basePercentage` set to 40%, `collateralPerPair` of 1, and `strikePrice` set at $12.
- If the expiry price is less than the strike price of $12, the long options expire worthless (out of the money). In this case, each long would be worth 0.4 UMA since `basePercentage` was set to 40%. 
- If the expiry price is above the strike, let's say $15, the payout would be equal to 0.4 + ((1 - 0.4) * (15 - 12) / 15) = 0.52. The long payout would be 0.52 UMA which is equivalent to the value of 0.4 UMA plus the value of the $12 embedded call. 

Specify this library with the flag `--fpl SuccessToken`. To set the fpl parameters for `SuccessToken`, use `--strikePrice` and `--basePercentage` as shown in the example deployment script below:

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$12 Success Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 1000000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$12 Success Token August 2021" --longSynthSymbol UMA-0821 --shortSynthName "UMA \$12 Success Short Token August 2021" --shortSynthSymbol UMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --fpl SuccessToken --strikePrice 12000000000000000000 --basePercentage 500000000000000000 --prepaidProposerBond 20000000000000000000 --optimisticOracleProposerBond 40000000000000000000
```

### Simple Success Token

A simple success token is the same as deploying a success token, except the `basePercentage` is set at 50%. A simple success token will always payout 50% of collateral as a floor, with the remaining 50% functioning like an embedded covered call. I.e., the token expires to be worth 0.5 + (1 - 0.5) * (expiryPrice - strikePrice).

As an example, consider a success token collateralized with UMA and `collateralPerPair` set at 1 and `strikePrice` set at $12.
- If the expiry price is less than the strike price of $12, the long options expire worthless (out of the money). In this case, each long would be worth 0.5 UMA since the basePercentage is always set to 50%. 
- If the expiry price is above the strike, let's say $15, the payout would be equal to 0.5 + ((1 - 0.5) * (15 - 12) / 15) = 0.6. The long payout would be 0.6 UMA which is equivalent to the value of 0.5 UMA plus the value of the $12 embedded call. 

Specify this library with the flag `--fpl SimpleSuccessToken`. To set the fpl parameters for `SimpleSuccessToken`, use `--strikePrice` as shown in the example deployment script below:

```bash
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$12 Success Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 1000000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$12 Success Token August 2021" --longSynthSymbol UMA-0821 --shortSynthName "UMA \$12 Success Short Token August 2021" --shortSynthSymbol UMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --fpl SimpleSuccessToken --strikePrice 12000000000000000000 --prepaidProposerBond 20000000000000000000 --optimisticOracleProposerBond 40000000000000000000
```

### New Libraries

In some cases, you may find yourself in need of a custom financial product library for your use case. If so, please see the `Deploying new financial product libraries`. The address of the custom financial product library can be specified with the `--financialProductLibraryAddress` flag.

## Deploying new financial product libraries

If you wish to deploy your own financial product library, fork the [protocol repo](https://github.com/UMAprotocol/protocol) and add your `CustomFinancialProductLibrary` Solidity file to [/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries). You will probably want a different name for your library, but this is an example!

Then take the following steps to deploy and verify the contract with Hardhat.

1. In the protocol repo, run `yarn` and `yarn build`.
2. Add your wallet mnemonic to your environment with `export MNEMONIC=your mnemonic string` or through an environment file.
3. Add your node url to your environment with `export CUSTOM_NODE_URL=your node url` or through an environment file. This should be filled in with a url for the network that you wish to deploy to. 
4. From `core`, run `yarn hardhat console --network mainnet`.
5. From the Hardhat console, run `deployments.deploy("CustomFinancialProductLibrary", { from: "0xYOURADDRESS" }).then(console.log)`
6. Make a note of the address of your newly deployed Financial Product Library.
7. OPTIONAL: To verify your contract on Etherscan, exit the Hardhat console, and run `CUSTOM_NODE_URL=https://your.node.url ETHERSCAN_API_KEY=YOUR_KEY yarn hardhat verify 0xDEPLOYED_FPL_ADDRESS --network mainnet`. To verify your contract with Polygonscan, replace url and --network with the network you are verifying a contract for and use your Polygonscan API for ETHERSCAN_API_KEY.
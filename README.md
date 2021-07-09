# Stub Package for Launching a New LSP

The purpose of this repository/package is to make it easy to customize your LSP (Long-Short Pair) deployment. Feel free to use this repository in place or fork and customize it.

For more information on the LSP, [read the docs](https://umaproject.org/lsp.html).

This launch repo currently is only for Kovan and Mumbai testnet LSP deployments. This will soon be updated to include Ethereum mainnet and Polygon deployments.

## Install system dependencies

You will need to install nodejs v14 and yarn. If you are testing on local fork with ganache, you will need to use node v12.

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
node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --lspCreatorAddress 0x566f98ECadE3EF95a6c5840621C43F15f403274c --pairName "UMA \$4-12 Range Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$4-12 Range Token August 2021" --longSynthSymbol rtUMA-0821 --shortSynthName "UMA \$4-12 Range Short Token August 2021" --shortSynthSymbol rtUMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --customAncillaryData "twapLength:3600" --optimisticOracleLivenessTime 3600 --fpl RangeBond
```

## Customize your deployment parameters

You can customize all of the deployment parameters of the LSP simply by changing the parameters that you pass in the run command above. See [the script](./index.js) or [documentation](https://docs.umaproject.org/synthetic-tokens/long-short-pair#lsp-construction-parameters) for more details about these parameters.

Your financial product library address will defines the payout function for your LSP. We have several [financial product libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries) available for transforming the price, identifier, or collateral requirement of an LSP before or after expiry. For these addresses, see the `Contract Addresses` section. In some cases, you may find yourself in need of a custom financial product library for your use case. If so, please see the `Deploying new financial product libraries`.

Note that the `LongShortPairCreator` contract will differentiate between long and short tokens by appending " Long Token" or " Short Token" to `syntheticName` and prepending "l" or "s" to the `syntheticSymbol`.

## Contract Addresses

See the files linked below for the `LongShortPairCreator` and financial product library contract addresses on various networks. You can pass these as parameters when deploying.

[Ethereum Mainnet](https://github.com/UMAprotocol/protocol/blob/master/packages/core/networks/1.json)

[Polygon Mainnet](https://github.com/UMAprotocol/protocol/blob/master/packages/core/networks/137.json)

[Kovan](https://github.com/UMAprotocol/protocol/blob/master/packages/core/networks/42.json)

[Mumbai](https://github.com/UMAprotocol/protocol/blob/master/packages/core/networks/80001.json)

## Deploying new financial product libraries

If you wish to deploy your own financial product library, fork the [protocol repo](https://github.com/UMAprotocol/protocol) and add your `CustomFinancialProductLibrary` Solidity file to [/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries). You will probably want a different name for your library, but this is an example!

Then take the following steps to deploy and verify the contract. Sorry that it's a bit complicated! We're working on a simpler workflow, probably using Hardhat deployment.

1. In the protocol repo, run `yarn` and `yarn build`.
2. Add your MetaMask mnemonic to your environment with `export MNEMONIC=your mnemonic string` or through an environment file.
3. From `core`, run `yarn truffle console --network mainnet_mnemonic`.
4. In the Truffle console, run `const fpl = await CustomFinancialProductLibrary.new({gasPrice: currentGasPriceInWei})`, filling in the current gas price. You can find prices in Gwei at [ETH Gas Station](https://www.ethgasstation.info/), and need to add nine zeroes to convert the Gwei price to wei. For example, if the current gas price in Gwei is `85`, you should enter `85000000000` in the place of `currentGasPriceInWei`. Make sure you have enough ETH in your wallet!
5. After deployment, still in the Truffle console, run `fpl.address`. This will output the deployed address of `CustomFinancialProductLibrary`.
6. Make a note of the deployed address and exit Truffle console.
7. Open `packages/core/artifacts/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries/CustomFinancialProductLibrary/CustomFinancialProductLibrary.dbg.json`. It should show some metadata about your Hardhat build, including the `buildInfo` file, which should look like `"../../../../../../build-info/example.json"`. Open the `example.json` file in the `build-info` directory.
8. In `build-info`, also create a new file called `solc-input.json`.
9. From `example.json`, copy the solc input data, which is everything in the curly brackets after `"input":`. Your text editor may have a way to collapse everything between the brackets so that you only have to copy `{...}`. Also note that you need to copy the curly brackets themselves, not just the stuff in between.
10. Paste the solc input data into `solc-input.json`.
11. Go to the [contract verification page](https://etherscan.io/verifyContract) on Etherscan, enter the deployed address of your library contract, select `Solidity (Standard-Json-Input)` as the compiler type, your compiler version, and your open source license type. Then click continue.
12. Click `Choose File` and choose your `solc-input.json` file in `build-info`. Then click the button that says `Click to Upload selected file`,
13. Complete the captcha and click `Verify and Publish`.
14. After some processing, Etherscan should verify your contract! This will allow you to read and write to the contract directly in Etherscan, in addition to seeing the source code.

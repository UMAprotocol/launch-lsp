# Stub Package for Launching a New LSP

The purpose of this repository/package is to make it easy to customize your LSP (Long-Short Pair) deployment. Feel free to use this repository in place or fork and customize it.

For more information on the LSP, [read the docs](https://umaproject.org/lsp.html).

## Install system dependencies

You will need to install nodejs v12 and yarn.

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

## Run the deployment script on kovan

```bash
node index.js --gasprice 50 --url YOUR_KOVAN_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --lspCreatorAddress 0x81b0A8206C559a0747D86B4489D0055db4720E84 --expirationTimestamp 1643678287 --collateralPerPair 1000000000000000000 --priceIdentifier USDETH --collateralToken 0xd0a1e359811322d97991e03f863a0c30c2cf029c --syntheticName "ETH 9000 USD Call [December 2021]" --syntheticSymbol ETHc9000-1221 --financialProductLibrary 0x2CcA11DbbDC3E028D6c293eA5d386eE887071C59
```

## Customize your deployment parameters

You can customize all of the deployment parameters of the LSP simply by changing the parameters that you pass in the run command above. See [the script](./index.js) or [documentation](https://docs.umaproject.org/synthetic-tokens/long-short-pair#lsp-construction-parameters) for more details about these parameters.

Your financial product library address will defines the payout function for your LSP. We have several [financial product libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries) available for transforming the price, identifier, or collateral requirement of an LSP before or after expiry. For these addresses, see the `Contract Addresses` section. In some cases, you may find yourself in need of a custom financial product library for your use case. If so, please see the `Deploying new financial product libraries`.

## Contract Addresses

These are the deployed addresses for the `LongShortPairCreator` and financial product library contracts on various networks. You can pass these as parameters when deploying.

### Kovan
LongShortPairCreator: 0x81b0A8206C559a0747D86B4489D0055db4720E84
BinaryOptionLongShortPairFinancialProductLibrary: 0xB1d60d41246B6d679cF89A1e57c46B1387538009
CoveredCallLongShortPairFinancialProductLibrary: 0x2CcA11DbbDC3E028D6c293eA5d386eE887071C59
LinearLongShortPairFinancialProductLibrary: 0x46b541E0fE2E817340A1A88740607329fF5ED279
RangeBondLongShortPairFinancialProductLibrary: 0xb8f4f21c9d276fddcece80e7a3e4c5d9f6addd63

### Mumbai
LongShortPairCreator: 0x6883FeB1c131F58C1Cd629289Da3dE0051d2aa0d
BinaryOptionLongShortPairFinancialProductLibrary: 0x2158C256b2d9B2b58D90D3ddA1b6a90d64498F7d
CoveredCallLongShortPairFinancialProductLibrary: 0xc19B7EF43a6eBd393446F401d1eCFac01B181ac0
LinearLongShortPairFinancialProductLibrary: 0x2aBf1Bd76655de80eDB3086114315Eec75AF500c
RangeBondLongShortPairFinancialProductLibrary: 0xb53A60f595EE2418be9F6057121EE77f0249AC28

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

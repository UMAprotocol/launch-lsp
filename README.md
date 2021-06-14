# Stub Package for Launching a New EMP

The purpose of this repository/package is to make it easy to customize your EMP deployment. Feel free to use this
repository in place or fork and customize it.

## Install system dependencies

You will need to install nodejs v12 (we recommend `nvm` to manage node versions) and yarn.

Note: these additional dependencies are required -- you may or may not have them on your system already:

- `libudev`
- `libusb`

These dependencies are installed on MacOSX by installing the XCode Developer Tools. For Linux, the example ubuntu installation command for additional deps is:

```bash
sudo apt-get update && sudo apt-get install -y libudev-dev libusb-1.0-0-dev
```

## Install packages

```bash
yarn
```

## Run the deployment script on a mainnet fork

It's a good idea to try out your deployment on a fork before running it on mainnet. This will allow you to run the deployment in a forked environment and interact with it to ensure it works as expected. To do this, you will use [Ganache](https://www.trufflesuite.com/ganache), a tool that allows for the creation of local Ethereum test networks.

You should replace `YOUR_NODE_URL` with the URL of whatever Kovan or mainnet Ethereum node that you wish to use. [Infura](https://infura.io/product/ethereum) provides easy access to Ethereum and is one method that you could use to get your node URL.

Start ganache.

```bash
yarn ganache-fork YOUR_NODE_URL
```

In a separate terminal, run the deployment script (it defaults to using localhost:8545 as the ETH node, which is
desired in this case). Note: mnemonic is optional here -- without it, ganache will use its default pre-loaded account.

```bash
node index.js --gasprice 50 --mnemonic "your mnemonic (12 word seed phrase)" --priceFeedIdentifier USDETH --collateralAddress "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" --expirationTimestamp "1643678287" --syntheticName "Yield Dollar [WETH Jan 2022]" --syntheticSymbol "YD-ETH-JAN22" --minSponsorTokens "100"
```

Now you should be able to use `localhost:8545` to interact with a forked version of mainnet (or kovan) where your
contract is deployed.

## Run the deployment script on mainnet or kovan

```bash
node index.js --gasprice 50 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --priceFeedIdentifier USDETH --collateralAddress "0xd0a1e359811322d97991e03f863a0c30c2cf029c" --expirationTimestamp "1643678287" --syntheticName "Yield Dollar [WETH Jan 2022]" --syntheticSymbol "YD-ETH-JAN22" --minSponsorTokens "100"
```

## Customize your deployment parameters

It is recommended to keep the default empParams struct and only customize your construction parameters by passing in the listed mandatory args. See [the script](./index.js) or [documentation](https://docs.umaproject.org/build-walkthrough/emp-parameters) for more details.

## Deploying financial product libraries

We have several [financial product libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries) available for transforming the price, identifier, or collateral requirement of an EMP before or after expiry. However, you may find yourself in need of a custom financial product library for your use case.

If so, fork the [protocol repo](https://github.com/UMAprotocol/protocol) and add your `CustomFinancialProductLibrary` Solidity file to [/packages/core/contracts/financial-templates/common/financial-product-libraries](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates/common/financial-product-libraries). You will probably want a different name for your library, but this is an example!

Then take the following steps to deploy and verify the contract. Sorry that it's a bit complicated! We're working on a simpler workflow, probably using Hardhat deployment.

1. In the protocol repo, run `yarn` and `yarn build`.
2. Add your MetaMask mnemonic to your environment with `export MNEMONIC=your mnemonic string` or through an environment file.
3. From `core`, run `yarn truffle console --network mainnet_mnemonic`.
4. In the Truffle console, run `const fpl = await CustomFinancialProductLibrary.new({gasPrice: currentGasPriceInWei})`, filling in the current gas price. You can find prices in Gwei at [ETH Gas Station](https://www.ethgasstation.info/), and need to add nine zeroes to convert the Gwei price to wei. For example, if the current gas price in Gwei is `85`, you should enter `85000000000` in the place of `currentGasPriceInWei`. Make sure you have enough ETH in your wallet!
5. After deployment, still in the Truffle console, run `fpl.address`. This will output the deployed address of `CustomFinancialProductLibrary`.
6. Make a note of the deployed address and exit Truffle console.
7. Open `packages/core/artifacts/contracts/financial-templates/common/financial-product-libraries/CustomFinancialProductLibrary/CustomFinancialProductLibrary.dbg.json`. It should show some metadata about your Hardhat build, including the `buildInfo` file, which should look like `"../../../../../build-info/example.json"`. Open the `example.json` file in the `build-info` directory.
8. In `build-info`, also create a new file called `solc-input.json`.
9. From `example.json`, copy the solc input data, which is everything in the curly brackets after `"input":`. Your text editor may have a way to collapse everything between the brackets so that you only have to copy `{...}`. Also note that you need to copy the curly brackets themselves, not just the stuff in between.
10. Paste the solc input data into `solc-input.json`.
11. Go to the [contract verification page](https://etherscan.io/verifyContract) on Etherscan, enter the deployed address of your library contract, select `Solidity (Standard-Json-Input)` as the compiler type, your compiler version, and your open source license type. Then click continue.
12. Click `Choose File` and choose your `solc-input.json` file in `build-info`. Then click the button that says `Click to Upload selected file`,
13. Complete the captcha and click `Verify and Publish`.
14. After some processing, Etherscan should verify your contract! This will allow you to read and write to the contract directly in Etherscan, in addition to seeing the source code.

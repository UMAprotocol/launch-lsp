const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const { getAbi, getAddress } = require("@uma/core");
const { parseFixed } = require("@ethersproject/bignumber");

// Arguments:
// --url: node url, by default points at http://localhost:8545.
// --mnemonic: an account mnemonic you'd like to use. The script will default to using the node's unlocked accounts.
// Mandatory arguments:
// --lspCreatorAddress: deployed address of the creator contract you're calling. This will be set based on chain ID in future releases.
// --gasprice: gas price to use in GWEI.
// --expirationTimestamp: timestamp that the contract will expire at.
// --collateralPerPair: how many units of collateral are required to mint one pair of synthetic tokens.
// --priceIdentifier: price identifier to use.
// --syntheticName: long name.
// --syntheticSymbol: short name.
// --collateralToken: ERC20 token used as as collateral in the LSP.
// --financialProductLibrary: Contract providing settlement payout logic.
// --ancillaryData: Custom ancillary data to be passed along with the price request. If not needed, this should be left as a 0-length bytes array.
// --proposerReward: Proposal reward to be forwarded to the created contract to be used to incentivize price proposals.
//
// Example deployment script:
// node index.js --url "your node url" --mnemonic "your mnemonic" --lspCreatorAddress 0x81b0A8206C559a0747D86B4489D0055db4720E84 --gasprice 50 --expirationTimestamp 1643678287 --collateralPerPair 1000000000000000000 --priceIdentifier USDETH --collateralToken 0xd0a1e359811322d97991e03f863a0c30c2cf029c --syntheticName "ETH 9000 USD Call [December 2021]" --syntheticSymbol ETHc9000-1221 --financialProductLibrary "0x2CcA11DbbDC3E028D6c293eA5d386eE887071C59"

const argv = require("minimist")(process.argv.slice(), {
  string: ["url", "mnemonic", "lspCreatorAddress", "expirationTimestamp", "collateralPerPair", "priceIdentifier", "collateralToken", "syntheticName", "syntheticSymbol", "financialProductLibrary", "customAncillaryData", "prepaidProposerReward", "gasprice"]
});

if (!argv.gasprice) throw "--gasprice required (in GWEI)";
// if (typeof argv.gasprice !== "number") throw "--gasprice must be a number";
if (argv.gasprice < 1 || argv.gasprice > 1000) throw "--gasprice must be between 1 and 1000 (GWEI)";

if (!argv.expirationTimestamp) throw "--expirationTimestamp required";
if (!argv.collateralPerPair) throw "--collateralPerPair required";
if (!argv.priceIdentifier) throw "--priceIdentifier required";
if (!argv.collateralToken) throw "--collateralToken required";
if (!argv.syntheticName) throw "--syntheticName required";
if (!argv.syntheticSymbol) throw "--syntheticSymbol required";
if (!argv.financialProductLibrary) throw "--financialProductLibrary required";

const lspCreatorAddress = argv.lspCreatorAddress ? argv.lspCreatorAddress : "0x81b0A8206C559a0747D86B4489D0055db4720E84"; // Kovan address
const ancillaryData = argv.customAncillaryData ? argv.customAncillaryData : "";
const proposerReward = argv.prepaidProposerReward ? argv.prepaidProposerReward : 0;

// Wrap everything in an async function to allow the use of async/await.
(async () => {
  const url = argv.url || "http://localhost:8545";

  // See HDWalletProvider documentation: https://www.npmjs.com/package/@truffle/hdwallet-provider.
  const hdwalletOptions = {
    mnemonic: {
      phrase: argv.mnemonic,
    },
    providerOrUrl: url,
    addressIndex: 0, // Change this to use the nth account.
  };

  // Initialize web3 with an HDWalletProvider if a mnemonic was provided. Otherwise, just give it the url.
  const web3 = new Web3(argv.mnemonic ? new HDWalletProvider(hdwalletOptions) : url);
  const { toWei, utf8ToHex, padRight } = web3.utils;

  const accounts = await web3.eth.getAccounts();
  if (!accounts || accounts.length === 0)
    throw "No accounts. Must provide mnemonic or node must have unlocked accounts.";
  const account = accounts[0];
  const networkId = await web3.eth.net.getId();

  // Grab collateral decimals.
  const collateral = new web3.eth.Contract(
    getAbi("IERC20Standard"),
    argv.collateralToken
  );
  const decimals = (await collateral.methods.decimals().call()).toString();


  // LSP parameters. Pass in arguments to customize these.
  const lspParams = {
    expirationTimestamp: argv.expirationTimestamp, // Timestamp that the contract will expire at.
    collateralPerPair: argv.collateralPerPair,
    priceIdentifier: padRight(utf8ToHex(argv.priceIdentifier.toString()), 64), // Price identifier to use.
    syntheticName: argv.syntheticName, // Long name.
    syntheticSymbol: argv.syntheticSymbol, // Short name.
    collateralToken: argv.collateralToken.toString(), // Collateral token address.
    financialProductLibrary: argv.financialProductLibrary,
    customAncillaryData: utf8ToHex(ancillaryData), // Default to empty bytes array if no ancillary data is passed.
    prepaidProposerReward: proposerReward // Default to 0 if no prepaid proposer reward is passed.
  };

  console.log("params:", lspParams);

  const lspCreator = new web3.eth.Contract(
    getAbi("LongShortPairCreator"),
    lspCreatorAddress
  );

  console.log("network id:", networkId);

  // Transaction parameters
  const transactionOptions = {
    gas: 12000000, // 12MM is very high. Set this lower if you only have < 2 ETH or so in your wallet.
    gasPrice: argv.gasprice * 1000000000, // gasprice arg * 1 GWEI
    from: account,
  };

  // Simulate transaction to test before sending to the network.
  console.log("Simulating Deployment...");
  const address = await lspCreator.methods.createLongShortPair(...Object.values(lspParams)).call(transactionOptions);
  console.log("Simulation successful. Expected Address:", address);

  // Since the simulated transaction succeeded, send the real one to the network.
  const { transactionHash } = await lspCreator.methods.createLongShortPair(...Object.values(lspParams)).send(transactionOptions);
  console.log("Deployed in transaction:", transactionHash);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1); // Exit with a nonzero exit code to signal failure.
});

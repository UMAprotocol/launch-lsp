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
// node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --lspCreatorAddress 0x566f98ECadE3EF95a6c5840621C43F15f403274c --pairName "UMA \$4-12 Range Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$4-12 Range Token August 2021" --longSynthSymbol rtUMA-0821 --shortSynthName "UMA \$4-12 Range Short Token August 2021" --shortSynthSymbol rtUMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --financialProductLibraryAddress 0xb8f4f21c9d276fddcece80e7a3e4c5d9f6addd63 --customAncillaryData "twapLength:3600" --optimisticOracleLivenessTime 3600

const argv = require("minimist")(process.argv.slice(), {
  string: ["url", "mnemonic", "lspCreatorAddress", "pairName", "expirationTimestamp", "collateralPerPair", "priceIdentifier", "longSynthName", "longSynthSymbol", "shortSynthName", "shortSynthSymbol", "collateralToken", "financialProductLibraryAddress", "customAncillaryData", "prepaidProposerReward", "optimisticOracleLivenessTime", "optimisticOracleProposerBond", "gasprice"]
});

if (!argv.gasprice) throw "--gasprice required (in GWEI)";
// if (typeof argv.gasprice !== "number") throw "--gasprice must be a number";
if (argv.gasprice < 1 || argv.gasprice > 1000) throw "--gasprice must be between 1 and 1000 (GWEI)";

if (!argv.pairName) throw "--pairName required";
if (!argv.expirationTimestamp) throw "--expirationTimestamp required";
if (!argv.collateralPerPair) throw "--collateralPerPair required";
if (!argv.priceIdentifier) throw "--priceIdentifier required";
if (!argv.longSynthName) throw "--longSynthName required";
if (!argv.longSynthSymbol) throw "--longSynthSymbol required";
if (!argv.shortSynthName) throw "--shortSynthName required";
if (!argv.shortSynthSymbol) throw "--shortSynthSymbol required";
if (!argv.collateralToken) throw "--collateralToken required";
if (!argv.financialProductLibraryAddress) throw "--financialProductLibraryAddress required";

const ancillaryData = argv.customAncillaryData ? argv.customAncillaryData : "";
const proposerReward = argv.prepaidProposerReward ? argv.prepaidProposerReward : 0;
const livenessTime = argv.optimisticOracleLivenessTime ? argv.optimisticOracleLivenessTime : 7200;

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
  console.log("network id:", networkId);

  // Grab collateral decimals.
  const collateral = new web3.eth.Contract(
    getAbi("IERC20Standard"),
    argv.collateralToken
  );
  const decimals = (await collateral.methods.decimals().call()).toString();

  // Get the final fee for the collateral type to use as default proposer bond.
  const storeAddress = await getAddress("Store", networkId);
  const store = new web3.eth.Contract(
    getAbi("Store"),
    storeAddress
  );
  const finalFee = (await store.methods.computeFinalFee(argv.collateralToken).call()).toString();
  console.log("final fee:", finalFee);
  const proposerBond = argv.optimisticOracleProposerBond ? argv.optimisticOracleProposerBond : finalFee;

  // LSP parameters. Pass in arguments to customize these.
  const lspParams = {
    pairName: argv.pairName,
    expirationTimestamp: argv.expirationTimestamp, // Timestamp that the contract will expire at.
    collateralPerPair: argv.collateralPerPair,
    priceIdentifier: padRight(utf8ToHex(argv.priceIdentifier.toString()), 64), // Price identifier to use.
    longSynthName: argv.longSynthName,
    longSynthSymbol: argv.longSynthSymbol,
    shortSynthName: argv.shortSynthName,
    shortSynthSymbol: argv.shortSynthSymbol,
    collateralToken: argv.collateralToken.toString(), // Collateral token address.
    financialProductLibrary: argv.financialProductLibraryAddress.toString(),
    customAncillaryData: utf8ToHex(ancillaryData), // Default to empty bytes array if no ancillary data is passed.
    prepaidProposerReward: proposerReward, // Default to 0 if no prepaid proposer reward is passed.
    optimisticOracleLivenessTime: livenessTime,
    optimisticOracleProposerBond: proposerBond
  };

  console.log("params:", lspParams);

  const lspCreatorAddress = argv.lspCreatorAddress ? argv.lspCreatorAddress : await getAddress("LongShortPairCreator", networkId);
  console.log("creator address:", lspCreatorAddress);

  const lspCreator = new web3.eth.Contract(
    getAbi("LongShortPairCreator"),
    lspCreatorAddress
  );

  // Transaction parameters
  const transactionOptions = {
    gas: 12000000, // 12MM is very high. Set this lower if you only have < 2 ETH or so in your wallet.
    gasPrice: argv.gasprice * 1000000000, // gasprice arg * 1 GWEI
    from: account
  };

  console.log("transaction options:", transactionOptions);

  // Simulate transaction to test before sending to the network.
  console.log("Simulating Deployment...");
  const address = await lspCreator.methods.createLongShortPair(lspParams).call(transactionOptions);
  console.log("Simulation successful. Expected Address:", address);

  // Since the simulated transaction succeeded, send the real one to the network.
  const { transactionHash } = await lspCreator.methods.createLongShortPair(lspParams).send(transactionOptions);
  console.log("Deployed in transaction:", transactionHash);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1); // Exit with a nonzero exit code to signal failure.
});

const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const { getAbi, getAddress } = require("@uma/core");
const { parseFixed } = require("@ethersproject/bignumber");

// Arguments:
// --url: node url, by default points at http://localhost:8545.
// --mnemonic: an account mnemonic you'd like to use. The script will default to using the node's unlocked accounts.
// Mandatory arguments:
// --gasprice: gas price to use in GWEI
// --expirationTimestamp: timestamp that the contract will expire at.
// --collateralPerPair: how many units of collateral are required to mint one pair of synthetic tokens.
// --priceIdentifier: price identifier to use.
// --syntheticName: long name.
// --syntheticSymbol: short name.
// --collateralToken: ERC20 token used as as collateral in the LSP.
// --financialProductLibrary: Contract providing settlement payout logic.
// --ancillaryData: Custom ancillary data to be passed along with the price request. If not needed, this should be left as a 0-length bytes array.
// --proposerReward: Proposal reward to be forwarded to the created contract to be used to incentivize price proposals.

const argv = require("minimist")(process.argv.slice(), {
  string: ["url", "mnemonic", "expirationTimestamp", "collateralPerPair", "priceIdentifier", "collateralToken", "syntheticName", "syntheticSymbol", "financialProductLibrary"]
});
if (!argv.expirationTimestamp) throw "--expirationTimestamp required";
if (!argv.collateralPerPair) throw "--collateralPerPair required";
if (!argv.priceIdentifier) throw "--priceIdentifier required";
if (!argv.collateralToken) throw "--collateralToken required";
if (!argv.syntheticName) throw "--syntheticName required";
if (!argv.syntheticSymbol) throw "--syntheticSymbol required";
if (!argv.gasprice) throw "--gasprice required (in GWEI)";
if (typeof argv.gasprice !== "number") throw "--gasprice must be a number";
if (argv.gasprice < 1 || argv.gasprice > 1000) throw "--gasprice must be between 1 and 1000 (GWEI)";
const financialProductLibraryAddress = argv.financialProductLibrary ? argv.financialProductLibrary : "0x0000000000000000000000000000000000000000";
const customAncillaryData = argv.ancillaryData ? argv.ancillaryData : [];
const prepaidProposerReward = argv.proposerReward ? argv.proposerReward : 0;

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


  // EMP Parameters. Pass in arguments to customize these.
  const lspParams = {
    expirationTimestamp: argv.expirationTimestamp.toString(), // Timestamp that the contract will expire at.
    collateralToken: argv.collateralToken.toString(), // Collateral token address.
    priceIdentifier: padRight(utf8ToHex(argv.priceIdentifier.toString()), 64), // Price identifier to use.
    syntheticName: argv.syntheticName, // Long name.
    syntheticSymbol: argv.syntheticSymbol, // Short name.
    collateralRequirement: { rawValue: toWei("1.25") }, // 125% collateral req.
    disputeBondPercentage: { rawValue: toWei("0.1") }, // 10% dispute bond.
    sponsorDisputeRewardPercentage: { rawValue: toWei("0.05") }, // 5% reward for sponsors who are disputed invalidly
    disputerDisputeRewardPercentage: { rawValue: toWei("0.2") }, // 20% reward for correct disputes.
    liquidationLiveness: 7200, // 2 hour liquidation liveness.
    withdrawalLiveness: 7200, // 2 hour withdrawal liveness.
    financialProductLibrary: financialProductLibraryAddress, // Default to 0x0 if no address is passed.
  };

  const empCreator = new web3.eth.Contract(
    getAbi("LongShortPairCreator"),
    getAddress("LongShortPairCreator", networkId)
  );

  // Transaction parameters
  const transactionOptions = {
    gas: 12000000, // 12MM is very high. Set this lower if you only have < 2 ETH or so in your wallet.
    gasPrice: argv.gasprice * 1000000000, // gasprice arg * 1 GWEI
    from: account,
  };

  // Simulate transaction to test before sending to the network.
  console.log("Simulating Deployment...");
  const address = await empCreator.methods.createLongShortPair(lspParams).call(transactionOptions);
  console.log("Simulation successful. Expected Address:", address);

  // Since the simulated transaction succeeded, send the real one to the network.
  const { transactionHash } = await empCreator.methods.createLongShortPair(lspParams).send(transactionOptions);
  console.log("Deployed in transaction:", transactionHash);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1); // Exit with a nonzero exit code to signal failure.
});

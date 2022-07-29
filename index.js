const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const { getAbi, getAddress } = require("@uma/contracts-node");
const { parseFixed } = require("@ethersproject/bignumber");

// Arguments:
// --url: node url, by default points at http://localhost:8545.
// --mnemonic: an account mnemonic you'd like to use. The script will default to using the node's unlocked accounts.
//
// Mandatory arguments:
// --gasprice: Gas price to use in GWEI.
// --expirationTimestamp: Timestamp that the contract will expire at.
// --collateralPerPair: How many units of collateral are required to mint one pair of synthetic tokens.
// --priceIdentifier: Price identifier to use.
// --pairName: General name for the long-short token pair.
// --longSynthName: Long token name.
// --longSynthSymbol: Long token symbol.
// --shortSynthName: Short token name.
// --shortSynthSymbol: Short token symbol.
// --collateralToken: ERC20 token used as as collateral in the LSP.
//
// Optional arguments:
// --lspCreatorAddress: Deployed address of the creator contract you're calling. This will be set based on chain ID if not specified.
// --financialProductLibraryAddress: Contract providing settlement payout logic. Required if --fpl not included.
// --enableEarlyExpiration: If set to true, the LSP contract can request to be settled early by calling the optimistic oracle. If not needed, the parameter will be set to false.
// --fpl: Name of the financial product library type, such as RangeBond or Linear. Required if --financialProductLibraryAddress not included.
// --customAncillaryData: Custom ancillary data to be passed along with the price request. If not needed, this should be left as a 0-length bytes array.
// --proposerReward: Proposal reward to be forwarded to the created contract to be used to incentivize price proposals.
// --optimisticOracleLivenessTime: Custom liveness window for disputing optimistic oracle price proposals. Longer provides more security, shorter provides faster settlement.
// --optimisticOracleProposerBond: Additional bond proposer must post with the optimistic oracle. A higher bond increases rewards to disputers if the price is incorrect.
// --strikePrice: Alias for lowerBound, used for certain financial product libraries with no upper bound. Cannot be included if --lowerBound is specified.
// --basePercentage: The percentage of collateral per pair used as the floor. This parameter is used with the 'SuccessToken' fpl where the remaining percentage functions like an embedded call option.
// --lowerBound: Lower bound of a price range for certain financial product libraries. Cannot be included if --strikePrice is specified.
// --upperBound: Upper bound of a price range for certain financial product libraries.
// --simulate: Boolean telling if the script should only simulate the transactions without sending them to the network.
// 
//
// Example deployment script:
// node index.js --gasprice 80 --url YOUR_NODE_URL --mnemonic "your mnemonic (12 word seed phrase)" --pairName "UMA \$4-12 Range Token Pair August 2021" --expirationTimestamp 1630447200 --collateralPerPair 250000000000000000 --priceIdentifier UMAUSD --longSynthName "UMA \$4-12 Range Token August 2021" --longSynthSymbol rtUMA-0821 --shortSynthName "UMA \$4-12 Range Short Token August 2021" --shortSynthSymbol rtUMA-0821s --collateralToken 0x489Bf230d4Ab5c2083556E394a28276C22c3B580 --customAncillaryData "twapLength:3600" --fpl RangeBond --lowerBound 4000000000000000000 --upperBound 12000000000000000000 --proposerReward 20000000000000000000 --optimisticOracleProposerBond --40000000000000000000

const argv = require("minimist")(process.argv.slice(), {
  string: [
    "url",
    "mnemonic",
    "lspCreatorAddress",
    "pairName",
    "expirationTimestamp",
    "collateralPerPair",
    "priceIdentifier",
    "longSynthName",
    "longSynthSymbol",
    "shortSynthName",
    "shortSynthSymbol",
    "collateralToken",
    "financialProductLibraryAddress",
    "fpl",
    "strikePrice",
    "basePercentage",
    "lowerBound",
    "upperBound",
    "customAncillaryData",
    "proposerReward",
    "optimisticOracleLivenessTime",
    "optimisticOracleProposerBond",
    "gasprice"
  ],
  boolean: [ "simulate", "enableEarlyExpiration" ]
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
if (!argv.financialProductLibraryAddress && !argv.fpl) throw "either --financialProductLibraryAddress or --fpl required";

const ancillaryData = argv.customAncillaryData ? argv.customAncillaryData : "";
const proposerReward = argv.proposerReward ? argv.proposerReward : 0;
const livenessTime = argv.optimisticOracleLivenessTime ? argv.optimisticOracleLivenessTime : 7200;
const earlyExpiration = argv.enableEarlyExpiration ? argv.enableEarlyExpiration : false;

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

  // Set FPL.
  const fpl = argv.fpl ? await getAddress(argv.fpl + "LongShortPairFinancialProductLibrary", networkId) : '';
  console.log("fpl:", fpl);
  const financialProductLibrary = argv.financialProductLibraryAddress ? argv.financialProductLibraryAddress.toString() : fpl;
  if (argv.fpl && !argv.lowerBound && !argv.strikePrice) throw "--lowerBound or --strikePrice required";
  if ((argv.fpl == 'RangeBond' || argv.fpl == 'Linear') && !argv.upperBound) throw "--upperBound required";
  if ((argv.fpl == 'SuccessToken') && !argv.basePercentage) throw "--basePercentage required";
  if (argv.lowerBound && argv.strikePrice) throw "you may specify --lowerBound or --strikePrice, but not both";

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
    financialProductLibrary: financialProductLibrary,
    customAncillaryData: utf8ToHex(ancillaryData), // Default to empty bytes array if no ancillary data is passed.
    proposerReward: proposerReward, // Default to 0 if no proposer reward is passed.
    optimisticOracleLivenessTime: livenessTime,
    optimisticOracleProposerBond: proposerBond,
    enableEarlyExpiration: earlyExpiration // Default to false if true is not passed
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
    gas: 10000000, // 10MM is very high. Set this lower if you only have < 2 ETH or so in your wallet.
    gasPrice: argv.gasprice * 1000000000, // gasprice arg * 1 GWEI
    from: account,
  };

  console.log("transaction options:", transactionOptions);

  // Simulate transaction to test before sending to the network.
  console.log("Simulating Deployment...");
  await lspCreator.methods.createLongShortPair(lspParams).call(transactionOptions);

  // Since the simulated transaction succeeded, send the real one to the network.
  let address;
  if (!argv.simulate) {
    const result = await lspCreator.methods.createLongShortPair(lspParams).send(transactionOptions);
    address = result.events.CreatedLongShortPair.returnValues.longShortPair;
    console.log("Deployed in transaction:", result.transactionHash, " LSP Address:", address);
  }

  // Set the FPL parameters.
  if (fpl) {
    console.log("Setting FPL parameters...");
    // Set the deployed FPL address and lowerBound.
    console.log("fpl address:", fpl);
    const fplName = argv.fpl + "LongShortPairFinancialProductLibrary";
    console.log("fpl name:", fplName);
    const deployedFPL = new web3.eth.Contract(getAbi(fplName), fpl);
    const lowerBound = argv.lowerBound ? argv.lowerBound : argv.strikePrice;
    // Set parameters depending on FPL type.
    if (argv.fpl == 'BinaryOption' || argv.fpl == 'CappedYieldDollar' || argv.fpl == 'CoveredCall' || argv.fpl == 'SimpleSuccessToken') {
      const fplParams = [address, lowerBound];
      console.log("fpl params:", {
        address: fplParams[0],
        lowerBound: fplParams[1]
      });
      if (!argv.simulate) {
        const { transactionHash } = await deployedFPL.methods.setLongShortPairParameters(...fplParams).send(transactionOptions);
        console.log("Financial product library parameters set in transaction:", transactionHash);
      }
    }
    if (argv.fpl == 'RangeBond' || argv.fpl == 'Linear') {
      const upperBound = argv.upperBound;
      const fplParams = [address, upperBound, lowerBound];
      console.log("fpl params:", {
        address: fplParams[0],
        upperBound: fplParams[1],
        lowerBound: fplParams[2]
      });
      if (!argv.simulate) {
        const { transactionHash } = await deployedFPL.methods.setLongShortPairParameters(...fplParams).send(transactionOptions);
        console.log("Financial product library parameters set in transaction:", transactionHash);
      }
    }
    if (argv.fpl == 'SuccessToken') {
      const basePercentage = argv.basePercentage;
      const fplParams = [address, lowerBound, basePercentage];
      console.log("fpl params:", {
        address: fplParams[0],
        lowerBound: fplParams[1],
        basePercentage: fplParams[2]
      });
      if (!argv.simulate) {
        const { transactionHash } = await deployedFPL.methods.setLongShortPairParameters(...fplParams).send(transactionOptions);
        console.log("Financial product library parameters set in transaction:", transactionHash);
      }
    }
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1); // Exit with a nonzero exit code to signal failure.
});

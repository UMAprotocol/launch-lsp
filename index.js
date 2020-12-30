const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const { getAbi, getAddress } = require("@uma/core");

// Optional arguments:
// --url: node url, by default points at http://localhost:8545.
// --mnemonic: an account mnemonic you'd like to use. The script will default to using the node's unlocked accounts.
const argv = require("minimist")(process.argv.slice(), {
  string: ["url", "mnemonic"],
});
if (!argv.gasprice) throw "--gasprice required (in GWEI)";
if (typeof argv.gasprice !== "number") throw "--gasprice must be a number";
if (argv.gasprice < 1 || argv.gasprice > 1000) throw "--gasprice must be between 1 and 1000 (GWEI)";

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

  // Example EMP Parameters. Customize these.
  const empParams = {
    expirationTimestamp: "1640995200", // 01/01/2022 @ 0:00 (UTC)
    collateralAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
    priceFeedIdentifier: padRight(utf8ToHex("USDETH"), 64), // Using the USDETH price.
    syntheticName: "uUSDwETH Synthetic Token Expiring 1 January 2022", // Long name.
    syntheticSymbol: "uUSDwETH-JAN", // Short name.
    collateralRequirement: { rawValue: toWei("1.25") }, // 125% collateral req.
    disputeBondPct: { rawValue: toWei("0.1") }, // 10% dispute bond.
    sponsorDisputeRewardPct: { rawValue: toWei("0.05") }, // 5% reward for sponsors who are disputed invalidly
    disputerDisputeRewardPct: { rawValue: toWei("0.2") }, // 20% reward for correct disputes.
    minSponsorTokens: { rawValue: toWei("100") }, // Min sponsor position size of 100 synthetic tokens.
    liquidationLiveness: 7200, // 2 hour liquidation liveness.
    withdrawalLiveness: 7200, // 2 hour withdrawal liveness.
    excessTokenBeneficiary: "0x54f44eA3D2e7aA0ac089c4d8F7C93C27844057BF", // UMA Store contract.
  };

  const accounts = await web3.eth.getAccounts();
  if (!accounts || accounts.length === 0)
    throw "No accounts. Must provide mnemonic or node must have unlocked accounts.";
  const account = accounts[0];
  const networkId = await web3.eth.net.getId();
  const empCreator = new web3.eth.Contract(
    getAbi("ExpiringMultiPartyCreator"),
    getAddress("ExpiringMultiPartyCreator", networkId)
  );

  // Transaction parameters
  const transactionOptions = {
    gas: 12000000, // 12MM is very high. Set this lower if you only have < 2 ETH or so in your wallet.
    gasPrice: argv.gasprice, // gasprice arg
    from: account,
  };

  // Simulate transaction to test before sending to the network.
  console.log("Simulating Deployment...");
  const address = await empCreator.methods.createExpiringMultiParty(empParams).call(transactionOptions);
  console.log("Simulation successful. Expected Address:", address);

  // Since the simulated transaction succeeded, send the real one to the network.
  const { transactionHash } = await empCreator.methods.createExpiringMultiParty(empParams).send(transactionOptions);
  console.log("Deployed in transaction:", transactionHash);
})().catch((e) => {
  console.error(e);
  process.exit(1); // Exit with a nonzero exit code to signal failure.
});

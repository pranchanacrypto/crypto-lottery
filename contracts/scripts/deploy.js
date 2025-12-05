const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying CryptoLottery contract...\n");

  // Configuration
  const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x49Ebd6bf6a1eF004dab7586CE0680eab9e1aFbCb";
  const BET_AMOUNT = hre.ethers.parseEther("0.1"); // 0.1 MATIC

  console.log("Configuration:");
  console.log(`- Receiving Wallet: ${RECEIVING_WALLET}`);
  console.log(`- Bet Amount: ${hre.ethers.formatEther(BET_AMOUNT)} MATIC\n`);

  // Deploy contract
  const CryptoLottery = await hre.ethers.getContractFactory("CryptoLottery");
  const lottery = await CryptoLottery.deploy(RECEIVING_WALLET, BET_AMOUNT);

  await lottery.waitForDeployment();
  const address = await lottery.getAddress();

  console.log("✅ CryptoLottery deployed to:", address);
  
  // Get current round info
  const currentRound = await lottery.getCurrentRound();
  console.log("\n📊 First Round Info:");
  console.log(`- Round ID: ${currentRound.roundId}`);
  console.log(`- Start Time: ${new Date(Number(currentRound.startTime) * 1000).toISOString()}`);
  console.log(`- Draw Time: ${new Date(Number(currentRound.drawTime) * 1000).toISOString()}`);

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    receivingWallet: RECEIVING_WALLET,
    betAmount: hre.ethers.formatEther(BET_AMOUNT),
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployment-info.json");
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("1. Save this contract address in your .env file");
  console.log("2. Update backend to use this contract address");
  console.log("3. Set up the automation script (see scripts/automate-draw.js)");
  console.log("\n🔐 To verify on Polygonscan:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${address} "${RECEIVING_WALLET}" "${BET_AMOUNT}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


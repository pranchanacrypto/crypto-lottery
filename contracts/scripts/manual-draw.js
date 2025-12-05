/**
 * Manual Draw Execution
 * Use this script to manually trigger a lottery draw
 * 
 * Usage: node scripts/manual-draw.js
 */

const hre = require("hardhat");

async function main() {
  console.log("🎰 Manual Lottery Draw Execution\n");

  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not set in .env file");
  }

  const CryptoLottery = await hre.ethers.getContractFactory("CryptoLottery");
  const lottery = CryptoLottery.attach(contractAddress);

  // Get current round
  const currentRound = await lottery.getCurrentRound();
  console.log("📊 Current Round Info:");
  console.log(`   Round ID: ${currentRound.roundId}`);
  console.log(`   Total Bets: ${currentRound.totalBets}`);
  console.log(`   Prize Pool: ${hre.ethers.formatEther(currentRound.prizePool)} MATIC`);
  console.log(`   Accumulated: ${hre.ethers.formatEther(currentRound.accumulatedAmount)} MATIC`);
  console.log(`   Draw Time: ${new Date(Number(currentRound.drawTime) * 1000).toISOString()}`);
  console.log(`   Finalized: ${currentRound.isFinalized}\n`);

  if (currentRound.isFinalized) {
    console.log("❌ Round already finalized!");
    return;
  }

  // Check if it's time
  const now = Math.floor(Date.now() / 1000);
  const drawTime = Number(currentRound.drawTime);
  
  if (now < drawTime) {
    console.log(`⚠️  Warning: It's before the scheduled draw time!`);
    console.log(`   Current time: ${new Date(now * 1000).toISOString()}`);
    console.log(`   Draw time: ${new Date(drawTime * 1000).toISOString()}`);
    console.log(`   Time until draw: ${Math.floor((drawTime - now) / 3600)} hours\n`);
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question('Continue anyway? (yes/no): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log("\n❌ Draw cancelled.");
      return;
    }
  }

  // Generate seed
  const seed = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  console.log(`\n🎲 Generated seed: ${seed}`);

  // Execute draw
  console.log("\n⏳ Executing draw...");
  const tx = await lottery.executeDraw(seed);
  console.log(`   Transaction: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`);

  // Get results
  const round = await lottery.rounds(currentRound.roundId);
  const winners = await lottery.getRoundWinners(currentRound.roundId);

  console.log(`🎯 Winning Numbers: [${round.winningNumbers.join(', ')}]\n`);
  console.log(`🏆 Winners: ${winners.length}\n`);
  
  if (winners.length > 0) {
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      console.log(`Winner #${i + 1}:`);
      console.log(`   Address: ${winner.player}`);
      console.log(`   Matches: ${winner.matches}/6`);
      console.log(`   Prize: ${hre.ethers.formatEther(winner.prizeAmount)} MATIC`);
      console.log(`   Paid: ${winner.paid ? '✅' : '❌'}\n`);
    }
  } else {
    console.log("No winners - prize rolled over! 🔄\n");
  }

  console.log("✅ Draw completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


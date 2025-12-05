/**
 * Automation Script for Lottery Draws
 * This script should run as a cron job to execute draws every Sunday at 22:00 UTC
 * 
 * Setup:
 * 1. Install: npm install node-cron
 * 2. Run: node scripts/automate-draw.js
 * 3. Or use a service like PM2: pm2 start scripts/automate-draw.js
 */

const hre = require("hardhat");
const cron = require("node-cron");

async function executeDraw() {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎰 EXECUTING LOTTERY DRAW - ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    // Load contract
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS not set in .env file");
    }

    const CryptoLottery = await hre.ethers.getContractFactory("CryptoLottery");
    const lottery = CryptoLottery.attach(contractAddress);

    // Get current round
    const currentRound = await lottery.getCurrentRound();
    console.log(`\n📊 Current Round: #${currentRound.roundId}`);
    console.log(`   Total Bets: ${currentRound.totalBets}`);
    console.log(`   Prize Pool: ${hre.ethers.formatEther(currentRound.prizePool)} MATIC`);
    console.log(`   Accumulated: ${hre.ethers.formatEther(currentRound.accumulatedAmount)} MATIC`);

    // Check if already finalized
    if (currentRound.isFinalized) {
      console.log("\n⚠️  Round already finalized. Skipping.");
      return;
    }

    // Check if it's time to draw
    const now = Math.floor(Date.now() / 1000);
    const drawTime = Number(currentRound.drawTime);
    
    if (now < drawTime) {
      console.log(`\n⏰ Too early to draw. Draw time: ${new Date(drawTime * 1000).toISOString()}`);
      return;
    }

    // Generate random seed (in production, use Chainlink VRF or similar)
    const seed = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    console.log(`\n🎲 Generating seed: ${seed}`);

    // Execute draw
    console.log("\n⏳ Executing draw transaction...");
    const tx = await lottery.executeDraw(seed);
    console.log(`   Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Get results
    const round = await lottery.rounds(currentRound.roundId);
    const winners = await lottery.getRoundWinners(currentRound.roundId);

    console.log(`\n🎯 WINNING NUMBERS: [${round.winningNumbers.join(', ')}]`);
    console.log(`\n🏆 WINNERS: ${winners.length}`);
    
    if (winners.length > 0) {
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        console.log(`\n   Winner #${i + 1}:`);
        console.log(`   - Address: ${winner.player}`);
        console.log(`   - Matches: ${winner.matches}/6`);
        console.log(`   - Prize: ${hre.ethers.formatEther(winner.prizeAmount)} MATIC`);
        console.log(`   - Paid: ${winner.paid ? '✅' : '❌'}`);
      }
    } else {
      console.log("\n   No winners - prize rolled over to next round! 🔄");
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log("✅ DRAW COMPLETED SUCCESSFULLY");
    console.log('='.repeat(60)\n);

  } catch (error) {
    console.error("\n❌ ERROR EXECUTING DRAW:");
    console.error(error);
    
    // Send alert (implement your notification system here)
    // e.g., email, Telegram, Discord webhook, etc.
  }
}

async function checkAndExecute() {
  console.log(`\n⏰ Checking if draw is needed... ${new Date().toISOString()}`);
  await executeDraw();
}

// Main function
async function main() {
  console.log("🤖 LOTTERY AUTOMATION STARTED");
  console.log("============================");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Network: ${hre.network.name}`);
  console.log("\n📅 Schedule: Every Sunday at 22:00 UTC");
  console.log("   Also checking every hour in case of missed draws\n");

  // Schedule: Every Sunday at 22:00 UTC
  cron.schedule('0 22 * * 0', async () => {
    await executeDraw();
  }, {
    timezone: "UTC"
  });

  // Backup check: Every hour (in case the main schedule fails)
  cron.schedule('0 * * * *', async () => {
    await checkAndExecute();
  }, {
    timezone: "UTC"
  });

  console.log("✅ Automation is running. Press Ctrl+C to stop.\n");

  // Keep the script running
  process.stdin.resume();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n\n⚠️  Shutting down automation...");
  process.exit(0);
});

// Run
main().catch((error) => {
  console.error(error);
  process.exit(1);
});


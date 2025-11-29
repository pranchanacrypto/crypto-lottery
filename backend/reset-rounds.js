import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reset rounds and bets data
 * Creates a fresh Round 1 with zero accumulated amount
 */

const roundsPath = path.join(__dirname, 'data', 'rounds.json');
const betsPath = path.join(__dirname, 'data', 'bets.json');

// Create fresh Round 1
const freshRound = {
  _id: '1',
  roundId: 1,
  startTime: new Date().toISOString(),
  drawDate: getNextPowerballDrawDate().toISOString(),
  winningNumbers: [],
  winningPowerball: null,
  isFinalized: false,
  finalizedAt: null,
  totalBets: 0,
  totalPrizePool: '0',
  accumulatedAmount: '0',  // START WITH ZERO
  rolloverAmount: '0',
  winners: {
    sixMatches: 0,
    fiveMatches: 0,
    fourMatches: 0,
    threeMatches: 0
  }
};

function getNextPowerballDrawDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const drawDays = [1, 3, 6]; // Mon, Wed, Sat
  
  let daysToAdd = 1;
  for (let i = 1; i <= 7; i++) {
    const checkDay = (dayOfWeek + i) % 7;
    if (drawDays.includes(checkDay)) {
      daysToAdd = i;
      break;
    }
  }
  
  const nextDraw = new Date(now);
  nextDraw.setDate(now.getDate() + daysToAdd);
  nextDraw.setHours(22, 59, 0, 0);
  
  return nextDraw;
}

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write fresh rounds.json
fs.writeFileSync(
  roundsPath,
  JSON.stringify([freshRound], null, 2),
  'utf-8'
);

// Write empty bets.json
fs.writeFileSync(
  betsPath,
  JSON.stringify([], null, 2),
  'utf-8'
);

console.log('✅ Data reset successfully!');
console.log('');
console.log('📊 Round 1 created:');
console.log(`   - Round ID: ${freshRound.roundId}`);
console.log(`   - Draw Date: ${freshRound.drawDate}`);
console.log(`   - Accumulated: ${freshRound.accumulatedAmount} MATIC`);
console.log(`   - Total Bets: ${freshRound.totalBets}`);
console.log('');
console.log('🗑️  All bets cleared');
console.log('');
console.log('🚀 Restart the backend to see changes');


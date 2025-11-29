// import axios from 'axios';
// import * as cheerio from 'cheerio';
import PowerballResult from '../models/PowerballResult.js';
import Round from '../models/Round.js';
import Bet from '../models/Bet.js';
import { calculateWinners, distributePrizes } from './prizeService.js';

/**
 * Fetch latest Powerball results via web scraping
 * NOTE: Temporarily disabled due to cheerio/Node.js compatibility
 * Use manualEntryResults() instead
 */
export async function fetchPowerballResults() {
  console.log('⚠️  Web scraping disabled. Use manual entry instead.');
  console.log('   Call POST /api/powerball/manual to add results');
  return [];
  
  /* Commented out due to cheerio dependency issues with Node 18
  try {
    const response = await axios.get('https://www.powerball.com/previous-results', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Parse the most recent result
    $('.item-details').first().each((i, element) => {
      const dateText = $(element).find('.date').text().trim();
      const numbersText = $(element).find('.numbers').text().trim();
      
      const numberMatch = numbersText.match(/(\d+)/g);
      
      if (numberMatch && numberMatch.length >= 6) {
        const numbers = numberMatch.slice(0, 5).map(n => parseInt(n));
        const powerball = parseInt(numberMatch[5]);
        
        results.push({
          drawDate: new Date(dateText),
          numbers,
          powerball
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error fetching Powerball results:', error.message);
    return [];
  }
  */
}

/**
 * Check for new Powerball results and process them
 */
export async function checkPowerballResults() {
  try {
    console.log('🔍 Checking for new Powerball results...');
    
    const results = await fetchPowerballResults();
    
    if (results.length === 0) {
      console.log('No results found');
      return null;
    }
    
    const latestResult = results[0];
    
    // Check if already processed
    const existing = await PowerballResult.findOne({
      drawDate: latestResult.drawDate
    });
    
    if (existing && existing.processed) {
      console.log('Result already processed');
      return existing;
    }
    
    // Save result
    const savedResult = await PowerballResult.findOneAndUpdate(
      { drawDate: latestResult.drawDate },
      latestResult,
      { upsert: true, new: true }
    );
    
    console.log('✅ New Powerball result:', savedResult);
    
    // Process the round
    await processRoundResults(savedResult);
    
    return savedResult;
  } catch (error) {
    console.error('Error checking Powerball results:', error);
    throw error;
  }
}

/**
 * Process round results and calculate winners
 */
async function processRoundResults(powerballResult) {
  try {
    // Find the round for this draw date
    const round = await Round.findOne({
      drawDate: { $lte: powerballResult.drawDate },
      isFinalized: false
    });
    
    if (!round) {
      console.log('No active round found for this draw');
      return;
    }
    
    console.log(`Processing round ${round.roundId}`);
    
    // Update round with winning numbers
    round.winningNumbers = powerballResult.numbers;
    round.winningPowerball = powerballResult.powerball;
    round.isFinalized = true;
    round.finalizedAt = new Date();
    
    // Calculate winners
    const winners = await calculateWinners(round);
    
    round.winners = {
      sixMatches: winners.sixMatches.length,
      fiveMatches: winners.fiveMatches.length,
      fourMatches: winners.fourMatches.length,
      threeMatches: winners.threeMatches.length
    };
    
    await round.save();
    
    // Mark result as processed
    powerballResult.processed = true;
    await powerballResult.save();
    
    // Distribute prizes
    await distributePrizes(round, winners);
    
    console.log(`✅ Round ${round.roundId} finalized and prizes distributed`);
    
    // Create next round
    await createNextRound(round);
    
  } catch (error) {
    console.error('Error processing round results:', error);
    throw error;
  }
}

/**
 * Create next round
 */
async function createNextRound(previousRound) {
  try {
    const nextDrawDate = getNextPowerballDrawDate();
    
    const newRound = await Round.create({
      roundId: previousRound.roundId + 1,
      startTime: new Date(),
      drawDate: nextDrawDate,
      isFinalized: false
    });
    
    console.log(`✅ Created round ${newRound.roundId} for draw on ${nextDrawDate}`);
    
    return newRound;
  } catch (error) {
    console.error('Error creating next round:', error);
    throw error;
  }
}

/**
 * Get next Powerball draw date (Mon, Wed, Sat at 10:59 PM ET)
 */
function getNextPowerballDrawDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const drawDays = [1, 3, 6];
  
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

/**
 * Manual entry of Powerball results
 */
export async function manualEntryResults(drawDate, numbers, powerball) {
  try {
    const result = await PowerballResult.create({
      drawDate: new Date(drawDate),
      numbers,
      powerball,
      processed: false
    });
    
    await processRoundResults(result);
    
    return result;
  } catch (error) {
    console.error('Error with manual entry:', error);
    throw error;
  }
}

/**
 * Get latest Powerball results from storage
 */
export async function getLatestResults(limit = 10) {
  try {
    return await PowerballResult.find().sort({ drawDate: -1 }).limit(limit);
  } catch (error) {
    console.error('Error getting latest results:', error);
    throw error;
  }
}


/**
 * API Service for Crypto Lottery
 * All API calls to the backend
 */

// Use environment variable or fallback to relative path (for Vite proxy in dev)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Handle API response
 */
async function handleResponse(response) {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }
  
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data;
}

/**
 * Health check
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return await response.json();
}

/**
 * Get current round information
 */
export async function getCurrentRound() {
  const response = await fetch(`${API_BASE}/bets/current-round`);
  return await handleResponse(response);
}

/**
 * Get recent bets
 * @param {number} limit - Number of bets to fetch (default: 20)
 */
export async function getRecentBets(limit = 20) {
  const response = await fetch(`${API_BASE}/bets/recent?limit=${limit}`);
  return await handleResponse(response);
}

/**
 * Place a new bet
 * @param {Object} betData
 * @param {number[]} betData.numbers - Array of 5 numbers (1-69)
 * @param {number} betData.powerball - Powerball number (1-26)
 * @param {string} betData.transactionId - Polygon transaction ID
 * @param {string} [betData.nickname] - Optional nickname
 */
export async function placeBet({ numbers, powerball, transactionId, nickname }) {
  const response = await fetch(`${API_BASE}/bets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      numbers,
      powerball,
      transactionId,
      nickname: nickname || null
    })
  });
  
  return await handleResponse(response);
}

/**
 * Check bet status by transaction ID
 * @param {string} transactionId - Polygon transaction ID
 */
export async function checkBetStatus(transactionId) {
  const response = await fetch(`${API_BASE}/bets/check/${transactionId}`);
  return await handleResponse(response);
}

/**
 * Get all bets for a specific round
 * @param {number} roundId - Round ID
 */
export async function getRoundBets(roundId) {
  const response = await fetch(`${API_BASE}/bets/round/${roundId}`);
  return await handleResponse(response);
}

/**
 * Get winners for a specific round
 * @param {number} roundId - Round ID
 */
export async function getRoundWinners(roundId) {
  const response = await fetch(`${API_BASE}/bets/winners/${roundId}`);
  return await handleResponse(response);
}

/**
 * Get next Powerball draw information
 */
export async function getNextDraw() {
  const response = await fetch(`${API_BASE}/powerball/next-draw`);
  return await handleResponse(response);
}

/**
 * Get latest Powerball results
 * @param {number} limit - Number of results (default: 10)
 */
export async function getLatestResults(limit = 10) {
  const response = await fetch(`${API_BASE}/powerball/latest?limit=${limit}`);
  return await handleResponse(response);
}

/**
 * Manually add Powerball result (admin only)
 * @param {Object} resultData
 * @param {string} resultData.drawDate - Draw date (YYYY-MM-DD)
 * @param {number[]} resultData.numbers - Array of 5 winning numbers
 * @param {number} resultData.powerball - Winning powerball number
 */
export async function addManualResult({ drawDate, numbers, powerball }) {
  const response = await fetch(`${API_BASE}/powerball/manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      drawDate,
      numbers,
      powerball
    })
  });
  
  return await handleResponse(response);
}

/**
 * Trigger check for new Powerball results (admin only)
 */
export async function checkPowerballResults() {
  const response = await fetch(`${API_BASE}/powerball/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return await handleResponse(response);
}

// Export all functions as default object
export default {
  checkHealth,
  getCurrentRound,
  getRecentBets,
  placeBet,
  checkBetStatus,
  getRoundBets,
  getRoundWinners,
  getNextDraw,
  getLatestResults,
  addManualResult,
  checkPowerballResults
};


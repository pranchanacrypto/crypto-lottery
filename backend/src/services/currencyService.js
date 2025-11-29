import axios from 'axios';

/**
 * Service to convert MATIC to USD
 */

// Cache for exchange rate (updated every 5 minutes)
let cachedRate = null;
let lastUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get current MATIC to USD exchange rate
 * Uses CoinGecko API (free, no API key required)
 */
export async function getMaticToUsdRate() {
  try {
    // Return cached rate if still valid
    if (cachedRate && lastUpdate && (Date.now() - lastUpdate < CACHE_DURATION)) {
      return cachedRate;
    }

    // Fetch new rate from CoinGecko
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd',
      { timeout: 5000 }
    );

    if (response.data && response.data['matic-network'] && response.data['matic-network'].usd) {
      cachedRate = response.data['matic-network'].usd;
      lastUpdate = Date.now();
      console.log(`✅ MATIC/USD rate updated: $${cachedRate}`);
      return cachedRate;
    }

    throw new Error('Invalid response from CoinGecko API');

  } catch (error) {
    console.error('Error fetching MATIC/USD rate:', error.message);
    
    // Return cached rate if available, even if expired
    if (cachedRate) {
      console.warn('⚠️ Using cached exchange rate due to API error');
      return cachedRate;
    }

    // Fallback to a reasonable default if no cache available
    console.warn('⚠️ Using fallback exchange rate: $0.50');
    return 0.50; // Fallback rate
  }
}

/**
 * Convert MATIC amount to USD
 * @param {number|string} maticAmount - Amount in MATIC
 * @returns {Promise<number>} Amount in USD
 */
export async function convertMaticToUsd(maticAmount) {
  const rate = await getMaticToUsdRate();
  const matic = parseFloat(maticAmount);
  return matic * rate;
}

/**
 * Convert USD amount to MATIC
 * @param {number} usdAmount - Amount in USD
 * @returns {Promise<number>} Amount in MATIC
 */
export async function convertUsdToMatic(usdAmount) {
  const rate = await getMaticToUsdRate();
  return usdAmount / rate;
}

/**
 * Format USD amount for display
 * @param {number} amount - USD amount
 * @returns {string} Formatted string (e.g., "$1,234.56")
 */
export function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Get exchange rate info for display
 */
export async function getExchangeRateInfo() {
  const rate = await getMaticToUsdRate();
  return {
    rate,
    lastUpdate: lastUpdate ? new Date(lastUpdate) : null,
    source: 'CoinGecko',
    formatted: formatUsd(rate)
  };
}


/**
 * Vue Composable for Lottery API
 * Provides reactive state and methods for lottery operations
 */

import { ref, computed } from 'vue';
import * as lotteryAPI from '../api/lottery.js';

export function useLottery() {
  // State
  const loading = ref(false);
  const error = ref(null);
  const currentRound = ref(null);
  const recentBets = ref([]);
  const nextDraw = ref(null);
  const latestResults = ref([]);

  // Computed
  const hasActiveRound = computed(() => currentRound.value !== null);
  const timeUntilDraw = computed(() => {
    if (!nextDraw.value) return null;
    return {
      days: nextDraw.value.daysUntilDraw,
      hours: nextDraw.value.hoursUntilDraw,
      date: new Date(nextDraw.value.nextDrawDate)
    };
  });

  /**
   * Load current round data
   */
  async function loadCurrentRound() {
    try {
      loading.value = true;
      error.value = null;
      const response = await lotteryAPI.getCurrentRound();
      currentRound.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error loading current round:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load recent bets
   */
  async function loadRecentBets(limit = 20) {
    try {
      loading.value = true;
      error.value = null;
      const response = await lotteryAPI.getRecentBets(limit);
      recentBets.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error loading recent bets:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load next draw information
   */
  async function loadNextDraw() {
    try {
      loading.value = true;
      error.value = null;
      const response = await lotteryAPI.getNextDraw();
      nextDraw.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error loading next draw:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load latest Powerball results
   */
  async function loadLatestResults(limit = 10) {
    try {
      loading.value = true;
      error.value = null;
      const response = await lotteryAPI.getLatestResults(limit);
      latestResults.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error loading latest results:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Place a new bet
   */
  async function submitBet(numbers, powerball, transactionId, nickname = null) {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await lotteryAPI.placeBet({
        numbers,
        powerball,
        transactionId,
        nickname
      });
      
      // Reload recent bets after placing a bet
      await loadRecentBets();
      await loadCurrentRound();
      
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error placing bet:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Check bet status
   */
  async function checkBet(transactionId) {
    try {
      loading.value = true;
      error.value = null;
      const response = await lotteryAPI.checkBetStatus(transactionId);
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error checking bet:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get winners for a round
   */
  async function loadWinners(roundId) {
    try {
      loading.value = true;
      error.value = null;
      const response = await lotteryAPI.getRoundWinners(roundId);
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error loading winners:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load all initial data
   */
  async function loadAll() {
    try {
      loading.value = true;
      error.value = null;
      
      await Promise.all([
        loadCurrentRound(),
        loadRecentBets(),
        loadNextDraw(),
        loadLatestResults()
      ]);
    } catch (err) {
      error.value = err.message;
      console.error('Error loading data:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Test API connection
   */
  async function testConnection() {
    try {
      const response = await lotteryAPI.checkHealth();
      console.log('✅ API Connection OK:', response);
      return true;
    } catch (err) {
      console.error('❌ API Connection Failed:', err);
      error.value = 'Failed to connect to API server';
      return false;
    }
  }

  return {
    // State
    loading,
    error,
    currentRound,
    recentBets,
    nextDraw,
    latestResults,
    
    // Computed
    hasActiveRound,
    timeUntilDraw,
    
    // Methods
    loadCurrentRound,
    loadRecentBets,
    loadNextDraw,
    loadLatestResults,
    submitBet,
    checkBet,
    loadWinners,
    loadAll,
    clearError,
    testConnection
  };
}

// Export singleton instance for global state (optional)
let instance = null;

export function useGlobalLottery() {
  if (!instance) {
    instance = useLottery();
  }
  return instance;
}


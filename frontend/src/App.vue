<template>
  <div id="app" class="min-h-screen p-2 sm:p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <header class="text-center mb-4 sm:mb-8">
        <h1 class="text-3xl sm:text-5xl md:text-6xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          🔮 CryptoBall
        </h1>
        <p class="text-sm sm:text-xl text-gray-300">Win Big. Stay Anonymous. Powered by Blockchain</p>
      </header>

      <!-- Main Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left: Bet Form -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Current Round Info -->
          <div class="card">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-sm sm:text-lg font-semibold text-purple-400">Current Round</h3>
                <p class="text-xl sm:text-2xl font-bold">#{{ currentRound?.roundId || '...' }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs sm:text-sm text-gray-400">Next Draw</p>
                <p class="font-semibold text-xs sm:text-base">{{ formatDrawDate(currentRound?.drawDate) }}</p>
                <p class="text-xs sm:text-sm text-gray-400">{{ currentRound?.totalBets || 0 }} bets placed</p>
              </div>
            </div>
          </div>

          <!-- Number Picker -->
          <div class="card">
            <h3 class="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Choose Your Numbers</h3>
            
            <!-- Instructions -->
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <p class="text-xs sm:text-sm text-blue-300">
                <strong>How to pick:</strong> Select 6 numbers from the grid below. 
                The <span class="text-red-400 font-bold">last number</span> you pick is automatically your <strong>Crypto Ball</strong> (must be ≤ 26).
              </p>
            </div>
            
            <!-- Selection Status -->
            <div class="flex justify-between items-center mb-2 sm:mb-3">
              <div class="flex gap-2 sm:gap-4">
                <p class="text-xs sm:text-sm">
                  <span class="text-purple-400 font-semibold">Regular:</span> 
                  <span class="text-gray-300">{{ regularNumbers.length }}/5</span>
                </p>
                <p class="text-xs sm:text-sm">
                  <span class="text-red-400 font-semibold">Crypto Ball:</span> 
                  <span class="text-gray-300">{{ powerball ? powerball : '-' }}</span>
                </p>
              </div>
              <p class="text-xs sm:text-sm text-gray-400">
                {{ selectedNumbers.length }}/6 total
              </p>
            </div>

            <!-- Error message for invalid crypto ball -->
            <div v-if="powerballError" class="bg-red-900/30 border border-red-500/50 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 animate-pulse">
              <p class="text-xs sm:text-sm text-red-300 font-semibold">⚠️ {{ powerballError }}</p>
            </div>
            
            <!-- Helper text when selecting 6th number -->
            <div v-if="selectedNumbers.length === 5" class="bg-orange-900/20 border border-orange-500/30 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
              <p class="text-xs sm:text-sm text-orange-300">
                🔮 <strong>Next number will be your Crypto Ball!</strong> Choose a number between <strong>1-26</strong>
              </p>
            </div>
            
            <!-- Single Number Grid (1-69) -->
            <div class="mb-6">
              <div class="grid grid-cols-7 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2">
                <button
                  v-for="num in 69"
                  :key="num"
                  @click="toggleNumber(num)"
                  :disabled="(!selectedNumbers.includes(num) && selectedNumbers.length >= 6) || 
                             (selectedNumbers.length === 5 && num > 26 && !selectedNumbers.includes(num))"
                  :class="[
                    'number-ball relative',
                    selectedNumbers.includes(num) 
                      ? (selectedNumbers.indexOf(num) === 5 ? 'powerball-selected' : 'number-ball-selected')
                      : 'number-ball-unselected',
                    (num > 26 && selectedNumbers.length === 5 && !selectedNumbers.includes(num)) ? 'opacity-30 cursor-not-allowed' : ''
                  ]"
                >
                  {{ num }}
                  <!-- Crypto Ball indicator -->
                  <span 
                    v-if="selectedNumbers.indexOf(num) === 5" 
                    class="absolute -top-0.5 -right-0.5 text-[10px] sm:text-xs bg-red-600 rounded-full w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center font-bold"
                  >
                    C
                  </span>
                </button>
              </div>
            </div>

            <!-- Quick Pick Button -->
            <div class="text-center mb-4 sm:mb-6">
              <button
                @click="quickPick"
                class="btn bg-gray-700 hover:bg-gray-600 text-white text-sm sm:text-base"
              >
                🎲 Quick Pick (Random)
              </button>
            </div>

            <!-- Selected Numbers Display -->
            <div v-if="selectedNumbers.length > 0" class="bg-gray-900/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <p class="text-xs sm:text-sm text-gray-400 mb-2">Your Selection:</p>
              <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                <!-- Regular numbers (first 5) -->
                <div
                  v-for="(num, index) in regularNumbers"
                  :key="'regular-' + num"
                  class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm sm:text-base shadow-lg"
                >
                  {{ num }}
                </div>
                <!-- Separator and Crypto Ball -->
                <span v-if="powerball" class="text-xl sm:text-2xl text-gray-400">+</span>
                <div
                  v-if="powerball"
                  class="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center font-bold text-sm sm:text-base shadow-lg border-2 border-red-300"
                >
                  {{ powerball }}
                  <span class="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 text-[10px] sm:text-xs bg-red-600 text-white rounded-full px-1.5 sm:px-2 py-0.5 font-bold shadow">
                    CB
                  </span>
                </div>
              </div>
            </div>

            <!-- Transaction ID Input -->
            <div class="mb-3 sm:mb-4">
              <label class="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">
                Transaction ID <span class="text-red-400">*</span>
              </label>
              <input
                v-model="transactionId"
                type="text"
                placeholder="Paste your Polygon transaction hash (0x...)"
                class="input text-sm"
              />
              <p class="text-[10px] sm:text-xs text-gray-400 mt-1 break-all">
                Send {{ betAmount }} MATIC to: <span class="font-mono text-purple-400">{{ receivingWallet }}</span>
              </p>
            </div>

            <!-- Nickname Input -->
            <div class="mb-4 sm:mb-6">
              <label class="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">
                Nickname <span class="text-gray-500">(Optional)</span>
              </label>
              <input
                v-model="nickname"
                type="text"
                maxlength="50"
                placeholder="Enter a nickname to appear in recent bets"
                class="input text-sm"
              />
            </div>

            <!-- Submit Button -->
            <button
              @click="placeBet"
              :disabled="!isValidBet || isSubmitting"
              class="btn btn-primary w-full text-base sm:text-lg"
            >
              <span v-if="isSubmitting">⏳ Submitting...</span>
              <span v-else-if="!isValidBet">Complete All Fields</span>
              <span v-else>🎰 Place Bet</span>
            </button>
          </div>

          <!-- Success/Error Messages -->
          <div v-if="successMessage" class="card bg-green-900/30 border-green-500/50">
            <div class="text-center">
              <div class="text-3xl sm:text-4xl mb-2">🎉</div>
              <h3 class="text-lg sm:text-xl font-bold text-green-400 mb-2">Bet Placed Successfully!</h3>
              <p class="text-xs sm:text-sm text-gray-300">{{ successMessage }}</p>
              <button @click="resetForm" class="btn bg-green-600 hover:bg-green-700 mt-3 sm:mt-4">
                Place Another Bet
              </button>
            </div>
          </div>

          <div v-if="errorMessage" class="card bg-red-900/30 border-red-500/50">
            <div class="text-center">
              <div class="text-3xl sm:text-4xl mb-2">⚠️</div>
              <h3 class="text-lg sm:text-xl font-bold text-red-400 mb-2">Error</h3>
              <p class="text-xs sm:text-sm text-gray-300">{{ errorMessage }}</p>
            </div>
          </div>

          <!-- How It Works -->
          <div class="card">
            <h3 class="text-lg sm:text-xl font-bold mb-3 sm:mb-4">How It Works</h3>
            <ol class="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-300">
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">1</span>
                <span class="break-all">Send {{ betAmount }} MATIC to <span class="font-mono text-purple-400">{{ receivingWallet }}</span></span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">2</span>
                <span>Copy your transaction hash and paste it above</span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">3</span>
                <span>Choose 6 numbers - the last one is your Powerball (must be ≤ 26)</span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">4</span>
                <span>Wait for the official lottery draw (Mon/Wed/Sat 10:59 PM ET)</span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">5</span>
                <span>If you win, prize automatically sent to your wallet! 💰</span>
              </li>
            </ol>
          </div>
        </div>

        <!-- Right: Recent Bets -->
        <div class="lg:col-span-1">
          <div class="card sticky top-4">
            <h3 class="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Recent Bets</h3>
            
            <!-- Loading -->
            <div v-if="loadingBets" class="text-center py-8 text-gray-400">
              <p>Loading...</p>
            </div>

            <!-- Bets List -->
            <div v-else-if="recentBets.length > 0" class="space-y-3 max-h-[600px] overflow-y-auto">
              <div
                v-for="bet in recentBets"
                :key="bet._id"
                class="bg-gray-900/50 rounded-lg p-3 hover:bg-gray-900/70 transition"
              >
                <div class="flex justify-between items-start mb-2">
                  <p class="font-semibold text-purple-400">
                    {{ bet.nickname || 'Anonymous' }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ formatTime(bet.betPlacedAt) }}
                  </p>
                </div>
                
                <!-- Numbers -->
                <div class="flex items-center gap-1 mb-2 flex-wrap">
                  <div
                    v-for="num in bet.numbers"
                    :key="num"
                    class="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-xs font-bold"
                  >
                    {{ num }}
                  </div>
                  <span class="text-sm">+</span>
                  <div class="w-7 h-7 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center text-xs font-bold" title="Crypto Ball">
                    {{ bet.powerball }}
                  </div>
                </div>
                
                <!-- Transaction Link -->
                <a
                  :href="`https://polygonscan.com/tx/${bet.transactionId}`"
                  target="_blank"
                  class="text-xs text-blue-400 hover:text-blue-300 font-mono block truncate"
                >
                  {{ bet.transactionId.slice(0, 10) }}...{{ bet.transactionId.slice(-8) }}
                </a>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-8 text-gray-400">
              <p class="text-4xl mb-2">🎰</p>
              <p class="text-sm">No bets yet. Be the first!</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-gray-400">
        <p class="mb-1 sm:mb-2">🔒 100% Anonymous | ⚡ Instant Payouts | 🔍 Fully Transparent</p>
        <p class="text-[10px] sm:text-xs">Prize Distribution: 6 matches (50%) | 5 matches (30%) | 4 matches (10%) | 3 matches (5%) | House (5%)</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const receivingWallet = import.meta.env.VITE_RECEIVING_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const betAmount = import.meta.env.VITE_BET_AMOUNT || '0.1';

// State
const selectedNumbers = ref([]); // All 6 numbers (first 5 are regular, 6th is powerball)
const transactionId = ref('');
const nickname = ref('');
const currentRound = ref(null);
const recentBets = ref([]);
const loadingBets = ref(false);
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const powerballError = ref('');

// Computed
const regularNumbers = computed(() => selectedNumbers.value.slice(0, 5));
const powerball = computed(() => selectedNumbers.value.length === 6 ? selectedNumbers.value[5] : null);

const isValidBet = computed(() => {
  if (selectedNumbers.value.length !== 6) return false;
  if (!transactionId.value.trim()) return false;
  
  // Check if crypto ball (last number) is valid (1-26)
  const pb = selectedNumbers.value[5];
  if (pb > 26) {
    powerballError.value = 'Crypto Ball must be between 1-26';
    return false;
  }
  
  powerballError.value = '';
  return true;
});

// Methods
function toggleNumber(num) {
  const index = selectedNumbers.value.indexOf(num);
  
  if (index > -1) {
    // Remove number
    selectedNumbers.value.splice(index, 1);
    powerballError.value = '';
  } else if (selectedNumbers.value.length < 6) {
    // Check if this will be the 6th number (crypto ball)
    if (selectedNumbers.value.length === 5 && num > 26) {
      // Don't allow numbers > 26 as crypto ball
      powerballError.value = 'Crypto Ball must be between 1-26. Please select a number ≤ 26.';
      return;
    }
    
    // Add number
    selectedNumbers.value.push(num);
    powerballError.value = '';
  }
}

function quickPick() {
  const numbers = [];
  
  // Pick 5 regular numbers (1-69)
  while (numbers.length < 5) {
    const num = Math.floor(Math.random() * 69) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  
  // Pick 1 crypto ball (1-26)
  let cryptoBall;
  do {
    cryptoBall = Math.floor(Math.random() * 26) + 1;
  } while (numbers.includes(cryptoBall));
  
  numbers.push(cryptoBall);
  selectedNumbers.value = numbers;
}

async function placeBet() {
  if (!isValidBet.value) return;
  
  isSubmitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  
  try {
    const response = await axios.post(`${API_URL}/bets`, {
      numbers: regularNumbers.value.sort((a, b) => a - b),
      powerball: powerball.value,
      transactionId: transactionId.value.trim(),
      nickname: nickname.value.trim() || null
    });
    
    successMessage.value = response.data.message;
    
    // Reload data
    await loadCurrentRound();
    await loadRecentBets();
    
  } catch (error) {
    console.error('Error placing bet:', error);
    errorMessage.value = error.response?.data?.error || 'Failed to place bet. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  selectedNumbers.value = [];
  transactionId.value = '';
  nickname.value = '';
  successMessage.value = '';
  errorMessage.value = '';
  powerballError.value = '';
}

async function loadCurrentRound() {
  try {
    const response = await axios.get(`${API_URL}/bets/current-round`);
    currentRound.value = response.data.data;
  } catch (error) {
    console.error('Error loading current round:', error);
  }
}

async function loadRecentBets() {
  loadingBets.value = true;
  try {
    const response = await axios.get(`${API_URL}/bets/recent?limit=20`);
    recentBets.value = response.data.data;
  } catch (error) {
    console.error('Error loading recent bets:', error);
  } finally {
    loadingBets.value = false;
  }
}

function formatDrawDate(date) {
  if (!date) return 'Loading...';
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Load data on mount
onMounted(() => {
  loadCurrentRound();
  loadRecentBets();
  
  // Refresh recent bets every 30 seconds
  setInterval(loadRecentBets, 30000);
});
</script>


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
          
          <!-- Prize Pool Banner (BIG USD Display) -->
          <div class="card bg-gradient-to-br from-green-900/40 via-emerald-900/40 to-green-900/40 border-green-500/50">
            <div class="text-center">
              <p class="text-xs sm:text-sm text-green-300 mb-1">💰 PRIZE POOL</p>
              <div class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-green-400 mb-2 drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                {{ currentRound?.prizePoolUsdFormatted || '$0.00' }}
              </div>
              
              <!-- Exchange Rate Warning -->
              <p class="text-[9px] sm:text-[10px] text-yellow-200/80 italic mb-2">
                ⚠️ USD value subject to MATIC price fluctuation
              </p>
              
              <!-- Show accumulated if > 0 -->
              <div v-if="parseFloat(currentRound?.accumulatedMatic || '0') > 0" class="mb-2">
                <p class="text-xs sm:text-sm text-yellow-300 font-semibold">
                  🔥 Includes {{ currentRound?.accumulatedUsdFormatted }} accumulated!
                </p>
              </div>
              
              <p class="text-xs sm:text-sm text-green-200">
                🏆 Winner takes 80% + accumulated!
              </p>
              <p class="text-[10px] sm:text-xs text-gray-400 mt-2">
                {{ currentRound?.prizePoolMatic || '0' }} MATIC @ ${{ currentRound?.exchangeRate || '0.00' }}/MATIC
              </p>
              <button 
                @click="showRulesModal = true"
                class="mt-3 text-[10px] sm:text-xs text-purple-400 hover:text-purple-300 underline decoration-dotted hover:decoration-solid transition-all"
              >
                📋 View Rules & Prize Distribution
              </button>
            </div>
          </div>
          
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

          <!-- Bet Mode Tabs -->
          <div class="card">
            <div class="flex gap-2 mb-4">
              <button
                @click="betMode = 'single'"
                :class="[
                  'flex-1 py-3 px-4 rounded-lg font-semibold transition-all',
                  betMode === 'single'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                ]"
              >
                🎯 Single Bet
              </button>
              <button
                @click="betMode = 'multiple'"
                :class="[
                  'flex-1 py-3 px-4 rounded-lg font-semibold transition-all',
                  betMode === 'multiple'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                ]"
              >
                🎰 Multiple Bets
              </button>
            </div>
          </div>

          <!-- Single Bet Mode -->
          <div v-if="betMode === 'single'" class="card">
            <h3 class="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Choose Your Numbers</h3>
            
            <!-- Instructions -->
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <p class="text-xs sm:text-sm text-blue-300">
                <strong>How to pick:</strong> Select any 6 numbers from the grid below (1-60). 
                <span class="text-gray-300">All balls count equally - choose your lucky numbers!</span>
              </p>
            </div>
            
            <!-- Selection Status -->
            <div class="flex justify-between items-center mb-2 sm:mb-3">
              <p class="text-xs sm:text-sm">
                <span class="text-purple-400 font-semibold">Selected:</span> 
                <span class="text-gray-300">{{ selectedNumbers.length }}/6 numbers</span>
              </p>
            </div>

            
            <!-- Single Number Grid (1-60) -->
            <div class="mb-6">
              <div class="grid grid-cols-7 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2">
                <button
                  v-for="num in 60"
                  :key="num"
                  @click="toggleNumber(num)"
                  :disabled="!selectedNumbers.includes(num) && selectedNumbers.length >= 6"
                  :class="[
                    'number-ball',
                    selectedNumbers.includes(num) 
                      ? 'number-ball-selected'
                      : 'number-ball-unselected'
                  ]"
                >
                  {{ num }}
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
                <!-- All numbers -->
                <div
                  v-for="(num, index) in selectedNumbers.slice().sort((a, b) => a - b)"
                  :key="'num-' + num"
                  class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm sm:text-base shadow-lg"
                >
                  {{ num }}
                </div>
              </div>
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
              :disabled="!isValidBet || isSubmitting || showingQRCode"
              class="btn btn-primary w-full text-base sm:text-lg"
            >
              <span v-if="isSubmitting">⏳ Processing...</span>
              <span v-else-if="showingQRCode">✓ Awaiting Payment...</span>
              <span v-else-if="!isValidBet">Select 6 Numbers First</span>
              <span v-else>💳 Continue to Payment</span>
            </button>
          </div>

          <!-- Multiple Bets Mode -->
          <div v-if="betMode === 'multiple'" class="card">
            <h3 class="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Generate Multiple Bets</h3>
            
            <!-- Instructions -->
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <p class="text-xs sm:text-sm text-blue-300">
                <strong>⚡ For Professional Players:</strong> Generate multiple random bets at once! 
                <span class="text-gray-300">Perfect for those who want to play many combinations quickly.</span>
              </p>
            </div>

            <!-- Bet Count Input -->
            <div class="mb-4">
              <label class="block text-xs sm:text-sm font-semibold text-gray-300 mb-2">
                How many bets do you want to make? <span class="text-red-400">*</span>
              </label>
              <div class="flex gap-2">
                <input
                  v-model.number="multiBetCount"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Enter number (1-100)"
                  class="input text-sm flex-1"
                />
                <button
                  @click="generateMultipleBets"
                  class="btn bg-purple-600 hover:bg-purple-700 text-white px-6"
                >
                  🎲 Generate
                </button>
              </div>
              <p class="text-[10px] sm:text-xs text-gray-400 mt-1">
                Each bet costs {{ betAmount }} MATIC
              </p>
            </div>

            <!-- Generated Bets Preview -->
            <div v-if="generatedBets.length > 0" class="mb-4">
              <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-3 sm:p-4 mb-3">
                <p class="text-sm font-semibold text-green-400 mb-1">
                  ✅ {{ generatedBets.length }} bets generated!
                </p>
                <p class="text-xs text-gray-300">
                  Total amount: <span class="font-bold text-green-400">{{ totalMultiBetAmount }} MATIC</span>
                </p>
              </div>

              <!-- Preview of all bets -->
              <div class="bg-gray-900/50 rounded-lg p-3 sm:p-4 mb-4 max-h-[400px] overflow-y-auto">
                <p class="text-xs text-gray-400 mb-2">All Generated Bets:</p>
                <div class="space-y-2">
                  <div
                    v-for="bet in generatedBets"
                    :key="bet.id"
                    class="flex items-center gap-2 bg-gray-800/50 rounded p-2"
                  >
                    <span class="text-xs text-gray-500 font-mono w-8">#{{ bet.id }}</span>
                    <div class="flex gap-1.5 flex-wrap">
                      <div
                        v-for="num in bet.numbers"
                        :key="num"
                        class="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-xs font-bold"
                      >
                        {{ num }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Nickname -->
              <div class="mb-4 sm:mb-6">
                <label class="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">
                  Nickname <span class="text-gray-500">(Optional)</span>
                </label>
                <input
                  v-model="multiNickname"
                  type="text"
                  maxlength="50"
                  placeholder="Enter a nickname"
                  class="input text-sm"
                />
              </div>

              <!-- Total Amount Display -->
              <div class="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                <p class="text-sm text-green-300 text-center">
                  Total Amount: <span class="font-bold text-lg text-green-400">{{ totalMultiBetAmount }} MATIC</span>
                </p>
              </div>

              <!-- Submit Button -->
              <button
                @click="placeMultipleBets"
                :disabled="!isValidMultiBet || isSubmitting || showingQRCode"
                class="btn btn-primary w-full text-base sm:text-lg"
              >
                <span v-if="isSubmitting">⏳ Processing...</span>
                <span v-else-if="showingQRCode">✓ Awaiting Payment...</span>
                <span v-else-if="!isValidMultiBet">Generate Bets First</span>
                <span v-else>💳 Continue to Payment ({{ totalMultiBetAmount }} MATIC)</span>
              </button>
            </div>
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
                <span class="break-all">Send {{ betAmount }} MATIC to 
                  <a 
                    :href="`https://polygonscan.com/address/${receivingWallet}`" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="font-mono text-purple-400 hover:text-purple-300 underline decoration-dotted hover:decoration-solid transition-all cursor-pointer inline-flex items-center gap-1"
                    title="View wallet on PolygonScan (check balance and transactions)"
                  >
                    {{ receivingWallet }}
                    <svg class="w-3 h-3 sm:w-4 sm:h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">2</span>
                <span>Copy your transaction hash and paste it above</span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">3</span>
                <span>Choose any 6 numbers (1-60). All count equally!</span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">4</span>
                <span>Wait for the official lottery draw (Mon/Wed/Sat 10:59 PM ET)</span>
              </li>
              <li class="flex gap-2 sm:gap-3">
                <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">5</span>
                <span>Whoever matched the most balls wins 95% of the pool! 💰</span>
              </li>
            </ol>
            
            <!-- Wallet Verification Note -->
            <div class="mt-4 bg-green-900/20 border border-green-500/30 rounded-lg p-3 sm:p-4">
              <p class="text-xs sm:text-sm text-green-300">
                <span class="font-semibold">💡 Transparency:</span> Click on the wallet address above to verify on PolygonScan that it exists and see the accumulated balance from bets in real-time!
              </p>
            </div>
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
                class="bg-gray-900/50 rounded-lg p-3 hover:bg-gray-900/70 transition border border-gray-700/50"
              >
                <!-- User -->
                <div class="mb-2">
                  <p class="text-sm font-semibold text-purple-400">
                    {{ bet.nickname || 'Anonymous' }}
                  </p>
                  <p class="text-[10px] text-gray-500">
                    {{ formatTime(bet.betPlacedAt) }}
                  </p>
                </div>
                
                <!-- Numbers -->
                <div class="mb-2">
                  <p class="text-[10px] text-gray-400 mb-1">Numbers:</p>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <div
                      v-for="num in bet.numbers.sort((a, b) => a - b)"
                      :key="num"
                      class="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-xs font-bold"
                    >
                      {{ num }}
                    </div>
                  </div>
                </div>
                
                <!-- Transaction Status -->
                <div>
                  <p class="text-[10px] text-gray-400 mb-1">Status:</p>
                  <a
                    :href="`https://polygonscan.com/tx/${bet.transactionId}`"
                    target="_blank"
                    class="inline-flex items-center gap-1.5"
                    title="Click to view transaction on PolygonScan"
                  >
                    <span 
                      v-if="bet.isValidated"
                      class="text-[10px] bg-green-600/30 text-green-400 border border-green-500/50 px-2 py-0.5 rounded font-semibold hover:bg-green-600/50 transition cursor-pointer"
                    >
                      ✓ Validated
                    </span>
                    <span 
                      v-else
                      class="text-[10px] bg-yellow-600/30 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded font-semibold hover:bg-yellow-600/50 transition cursor-pointer"
                    >
                      ⏳ Pending
                    </span>
                    <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </div>
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
        <button 
          @click="showRulesModal = true"
          class="text-[10px] sm:text-xs text-purple-400 hover:text-purple-300 underline"
        >
          📋 View Complete Rules
        </button>
      </footer>
    </div>

    <!-- QR Code Payment Modal -->
    <div 
      v-if="showingQRCode && paymentSession"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div 
        @click.stop
        class="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 rounded-2xl max-w-md w-full shadow-2xl"
      >
        <!-- Modal Header -->
        <div class="bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-sm border-b border-purple-500/50 p-4 sm:p-6">
          <div class="text-center">
            <h2 class="text-xl sm:text-2xl font-bold text-purple-300 mb-2">💳 Complete Payment</h2>
            <p class="text-sm text-gray-300">
              Scan QR Code with your crypto wallet
            </p>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="p-6 space-y-4">
          
          <!-- QR Code -->
          <div class="flex justify-center bg-white rounded-xl p-4">
            <img :src="qrCodeDataUrl" alt="Payment QR Code" class="w-64 h-64" />
          </div>

          <!-- Payment Details -->
          <div class="bg-gray-900/50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-400">Amount:</span>
              <span class="text-lg font-bold text-green-400">{{ paymentSession.totalAmount }} MATIC</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-400">Bets:</span>
              <span class="font-semibold text-purple-400">{{ paymentSession.betCount }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-400">Network:</span>
              <span class="font-semibold text-blue-400">Polygon (MATIC)</span>
            </div>
          </div>

          <!-- Wallet Address (for manual copy) -->
          <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p class="text-xs text-blue-300 mb-1">Or send manually to:</p>
            <div class="flex items-center gap-2">
              <code class="text-xs font-mono text-blue-400 break-all flex-1">{{ paymentSession.receivingWallet }}</code>
              <button
                @click="copyToClipboard(paymentSession.receivingWallet)"
                class="text-blue-400 hover:text-blue-300 transition-colors"
                title="Copy address"
              >
                📋
              </button>
            </div>
          </div>

          <!-- Status -->
          <div class="text-center">
            <div v-if="checkingPayment" class="flex items-center justify-center gap-2 text-yellow-400">
              <div class="animate-spin">⏳</div>
              <span class="text-sm font-semibold">Waiting for payment...</span>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Your bet will be automatically confirmed once payment is detected
            </p>
          </div>

          <!-- Instructions -->
          <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <p class="text-xs text-green-300">
              <strong>📱 How to pay:</strong>
            </p>
            <ol class="text-xs text-gray-300 mt-2 space-y-1 ml-4 list-decimal">
              <li>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
              <li>Scan the QR code or copy the address above</li>
              <li>Send <strong>{{ paymentSession.totalAmount }} MATIC</strong> on Polygon network</li>
              <li>Wait for confirmation (usually 10-30 seconds)</li>
            </ol>
          </div>

          <!-- Cancel Button -->
          <button
            @click="resetPaymentSession"
            class="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Rules Modal -->
    <div 
      v-if="showRulesModal"
      @click="showRulesModal = false"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div 
        @click.stop
        class="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <!-- Modal Header -->
        <div class="sticky top-0 bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-sm border-b border-purple-500/50 p-4 sm:p-6">
          <div class="flex justify-between items-center">
            <h2 class="text-xl sm:text-2xl font-bold text-purple-300">📋 CryptoBall Rules</h2>
            <button 
              @click="showRulesModal = false"
              class="text-gray-400 hover:text-white transition-colors text-2xl sm:text-3xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="p-4 sm:p-6 space-y-6">
          
          <!-- How to Play -->
          <section>
            <h3 class="text-lg sm:text-xl font-bold text-purple-400 mb-3">🎮 How to Play</h3>
            <ol class="space-y-2 text-sm text-gray-300">
              <li class="flex gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">1</span>
                <span>Send {{ betAmount }} MATIC to our receiving wallet</span>
              </li>
              <li class="flex gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>Choose any 6 numbers (1-60). <strong>All count equally!</strong></span>
              </li>
              <li class="flex gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">3</span>
                <span>Paste your transaction hash and submit your bet</span>
              </li>
              <li class="flex gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">4</span>
                <span>Wait for the official lottery draw (Monday, Wednesday, Saturday at 10:59 PM ET)</span>
              </li>
              <li class="flex gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">5</span>
                <span>Winners receive prizes automatically to their wallet! 💰</span>
              </li>
            </ol>
          </section>

          <!-- Prize Distribution -->
          <section class="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/50 rounded-lg p-4">
            <h3 class="text-lg sm:text-xl font-bold text-yellow-400 mb-3">🏆 Prize Distribution Strategy</h3>
            
            <div class="space-y-3 text-sm text-yellow-100">
              <p class="font-semibold text-yellow-200">Whoever matched the MOST balls wins!</p>
              
              <div class="bg-black/30 rounded p-3 space-y-2">
                <p><strong>✅ Winner(s):</strong> Take <span class="text-green-400 font-bold text-lg">80%</span> of new bets + <span class="text-yellow-400 font-bold text-lg">ALL accumulated</span></p>
                <p><strong>🔄 Rollover:</strong> <span class="text-blue-400 font-bold">15%</span> accumulates to next round</p>
                <p><strong>🏠 House Fee:</strong> <span class="text-orange-400 font-bold">5%</span> (operational costs)</p>
              </div>

              <div class="bg-blue-900/30 rounded p-3 mt-3 mb-3">
                <p class="text-xs text-blue-200">
                  <strong>⚠️ Important:</strong> All 6 numbers count equally. It doesn't matter which specific numbers you matched or in what order. 
                  Only the <strong>total number of matches</strong> matters!
                </p>
              </div>

              <div class="space-y-2 mt-4">
                <p class="font-semibold text-yellow-200">Examples:</p>
                <ul class="space-y-1.5 ml-4 text-xs">
                  <li>• <strong>1 person matched 6/6 balls</strong> → Takes 80% + accumulated alone</li>
                  <li>• <strong>3 people matched 6/6 balls</strong> → Split 80% + accumulated equally</li>
                  <li>• <strong>Nobody matched 6/6, but 2 matched 5/6</strong> → Those 2 split the prize</li>
                  <li>• <strong>Nobody matched 6 or 5, but 1 matched 4/6</strong> → Takes 80% + accumulated alone</li>
                  <li>• <strong>Nobody matched ANY balls</strong> → 100% rolls to next round (jackpot grows!)</li>
                </ul>
              </div>
              
              <div class="bg-green-900/30 rounded p-3 mt-3">
                <p class="text-xs text-green-200">
                  <strong>💡 Jackpot Effect:</strong> 15% always accumulates, creating growing jackpots! 
                  The longer without a winner, the bigger the prize gets!
                </p>
              </div>
            </div>
          </section>

          <!-- Important Notes -->
          <section>
            <h3 class="text-lg sm:text-xl font-bold text-blue-400 mb-3">⚠️ Important Notes</h3>
            <ul class="space-y-2 text-sm text-gray-300 ml-4 list-disc">
              <li>Each transaction can only be used once</li>
              <li>Your bet must be placed before the draw date</li>
              <li>Minimum bet: {{ betAmount }} MATIC</li>
              <li>You must choose exactly 6 numbers (1-60)</li>
              <li><strong>All 6 numbers count equally</strong> - no number is more important than another</li>
              <li>Only the <strong>total number of matches</strong> matters, not which specific numbers or order</li>
              <li>All transactions are validated on Polygon blockchain</li>
              <li>Prizes are automatically sent to the wallet that made the bet</li>
              <li>Stay anonymous - only your wallet address is recorded</li>
            </ul>
          </section>

          <!-- Transparency -->
          <section class="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <h3 class="text-lg sm:text-xl font-bold text-green-400 mb-3">🔍 Transparency & Security</h3>
            <ul class="space-y-2 text-sm text-green-200 ml-4 list-disc">
              <li>All bets are verified on Polygon blockchain</li>
              <li>You can verify the receiving wallet balance on PolygonScan</li>
              <li>Winning numbers come from official lottery results</li>
              <li>Prize distribution is automatic and transparent</li>
              <li>No registration required - fully anonymous</li>
            </ul>
          </section>

        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm border-t border-purple-500/50 p-4 text-center">
          <button 
            @click="showRulesModal = false"
            class="btn btn-primary"
          >
            Got it! Let's Play 🎰
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// State
const selectedNumbers = ref([]); // All 6 numbers
const transactionId = ref('');
const nickname = ref('');
const currentRound = ref(null);
const recentBets = ref([]);
const loadingBets = ref(false);
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showRulesModal = ref(false);

// Multi-bet state
const betMode = ref('single'); // 'single' or 'multiple'
const multiBetCount = ref(10);
const generatedBets = ref([]);
const multiTransactionId = ref('');
const multiNickname = ref('');

// Config from backend
const receivingWallet = ref('0x49Ebd6bf6a1eF004dab7586CE0680eab9e1aFbCb');
const betAmount = ref('0.1');

// Payment session state
const paymentSession = ref(null);
const qrCodeDataUrl = ref('');
const checkingPayment = ref(false);
const paymentCheckInterval = ref(null);
const showingQRCode = ref(false);

// Computed
const isValidBet = computed(() => {
  if (selectedNumbers.value.length !== 6) return false;
  return true;
});

const isValidMultiBet = computed(() => {
  if (generatedBets.value.length === 0) return false;
  return true;
});

const totalMultiBetAmount = computed(() => {
  return (parseFloat(betAmount.value) * generatedBets.value.length).toFixed(2);
});

// Methods
async function initPaymentSession(betCount = 1) {
  try {
    const response = await axios.post(`${API_URL}/bets/init-session`, {
      betCount
    });
    
    paymentSession.value = response.data.data;
    
    // Generate QR code
    const paymentUri = `ethereum:${paymentSession.value.receivingWallet}@137?value=${parseFloat(paymentSession.value.totalAmount) * 1e18}`;
    qrCodeDataUrl.value = await QRCode.toDataURL(paymentUri, {
      width: 300,
      margin: 2,
      color: {
        dark: '#9333ea', // purple-600
        light: '#ffffff'
      }
    });
    
    showingQRCode.value = true;
    
    // Start checking for payment
    startPaymentCheck();
    
    return paymentSession.value;
  } catch (error) {
    console.error('Error initializing payment session:', error);
    errorMessage.value = 'Failed to initialize payment session';
    throw error;
  }
}

function startPaymentCheck() {
  checkingPayment.value = true;
  
  // Check immediately
  checkPayment();
  
  // Then check every 5 seconds
  paymentCheckInterval.value = setInterval(checkPayment, 5000);
}

function stopPaymentCheck() {
  checkingPayment.value = false;
  if (paymentCheckInterval.value) {
    clearInterval(paymentCheckInterval.value);
    paymentCheckInterval.value = null;
  }
}

async function checkPayment() {
  if (!paymentSession.value) return;
  
  try {
    const response = await axios.get(`${API_URL}/bets/check-payment/${paymentSession.value.sessionId}`);
    
    if (response.data.data.paymentFound) {
      stopPaymentCheck();
      
      // Payment confirmed! Now submit the bet
      await completeBetSession();
    }
  } catch (error) {
    console.error('Error checking payment:', error);
  }
}

async function completeBetSession() {
  try {
    isSubmitting.value = true;
    
    let numbers;
    let nickname_value;
    
    if (betMode.value === 'single') {
      numbers = selectedNumbers.value;
      nickname_value = nickname.value;
    } else {
      numbers = generatedBets.value.map(bet => bet.numbers);
      nickname_value = multiNickname.value;
    }
    
    const response = await axios.post(`${API_URL}/bets/complete-session`, {
      sessionId: paymentSession.value.sessionId,
      numbers,
      nickname: nickname_value.trim() || null
    });
    
    successMessage.value = response.data.message;
    
    // Reset form
    resetPaymentSession();
    resetForm();
    
    // Reload data
    await loadCurrentRound();
    await loadRecentBets();
    
  } catch (error) {
    console.error('Error completing bet session:', error);
    errorMessage.value = error.response?.data?.error || 'Failed to complete bet. Please contact support.';
  } finally {
    isSubmitting.value = false;
  }
}

function resetPaymentSession() {
  paymentSession.value = null;
  qrCodeDataUrl.value = '';
  showingQRCode.value = false;
  stopPaymentCheck();
}

function toggleNumber(num) {
  const index = selectedNumbers.value.indexOf(num);
  
  if (index > -1) {
    // Remove number
    selectedNumbers.value.splice(index, 1);
  } else if (selectedNumbers.value.length < 6) {
    // Add number
    selectedNumbers.value.push(num);
  }
}

function quickPick() {
  const numbers = [];
  
  // Pick 6 random numbers (1-60)
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 60) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  
  selectedNumbers.value = numbers;
}

async function placeBet() {
  if (!isValidBet.value) return;
  
  isSubmitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  
  try {
    // Initialize payment session for single bet
    await initPaymentSession(1);
    
  } catch (error) {
    console.error('Error placing bet:', error);
    errorMessage.value = error.response?.data?.error || 'Failed to place bet. Please try again.';
    isSubmitting.value = false;
  }
}

function resetForm() {
  selectedNumbers.value = [];
  transactionId.value = '';
  nickname.value = '';
  generatedBets.value = [];
  multiTransactionId.value = '';
  multiNickname.value = '';
  successMessage.value = '';
  errorMessage.value = '';
  resetPaymentSession();
}

function generateRandomNumbers() {
  const numbers = [];
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 60) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
}

function generateMultipleBets() {
  const count = parseInt(multiBetCount.value);
  if (count < 1 || count > 100) {
    errorMessage.value = 'Please enter a number between 1 and 100';
    return;
  }
  
  generatedBets.value = [];
  for (let i = 0; i < count; i++) {
    generatedBets.value.push({
      id: i + 1,
      numbers: generateRandomNumbers()
    });
  }
  
  successMessage.value = '';
  errorMessage.value = '';
}

async function placeMultipleBets() {
  if (!isValidMultiBet.value) return;
  
  isSubmitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  
  try {
    // Initialize payment session for multiple bets
    await initPaymentSession(generatedBets.value.length);
    
  } catch (error) {
    console.error('Error placing multiple bets:', error);
    errorMessage.value = error.response?.data?.error || 'Failed to place bets. Please try again.';
    isSubmitting.value = false;
  }
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

async function loadConfig() {
  try {
    const response = await axios.get(`${API_URL}/config`);
    if (response.data.success) {
      receivingWallet.value = response.data.data.receivingWallet;
      betAmount.value = response.data.data.betAmount;
      console.log('✅ Config loaded:', response.data.data);
    }
  } catch (error) {
    console.error('Error loading config:', error);
    // Keep default values if config fails to load
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

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show brief success feedback
    const originalText = text;
    setTimeout(() => {
      console.log('Copied:', originalText);
    }, 100);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Load data on mount
onMounted(async () => {
  await loadConfig(); // Load config first
  loadCurrentRound();
  loadRecentBets();
  
  // Refresh recent bets every 30 seconds
  setInterval(loadRecentBets, 30000);
});

// Cleanup on unmount
onUnmounted(() => {
  stopPaymentCheck();
});
</script>


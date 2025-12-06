import { ethers } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com';
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || '0x49Ebd6bf6a1eF004dab7586CE0680eab9e1aFbCb'; // The wallet that receives bets
const BET_AMOUNT = process.env.BET_AMOUNT || '0.1'; // Minimum bet amount in MATIC

let provider;

// Initialize provider
export function initProvider() {
  provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  console.log('✅ Blockchain provider initialized');
}

/**
 * Validate a transaction ID on Polygon blockchain
 * @param {string} txId - Transaction hash
 * @returns {Promise<Object>} Transaction details if valid
 */
export async function validateTransaction(txId) {
  try {
    if (!provider) initProvider();
    
    // Get transaction from blockchain
    const tx = await provider.getTransaction(txId);
    
    if (!tx) {
      throw new Error('Transaction not found on blockchain');
    }
    
    // Wait for transaction to be mined if pending
    if (!tx.blockNumber) {
      throw new Error('Transaction is still pending');
    }
    
    // Get transaction receipt for more details
    const receipt = await provider.getTransactionReceipt(txId);
    
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }
    
    // Check if transaction was successful
    if (receipt.status !== 1) {
      throw new Error('Transaction failed on blockchain');
    }
    
    // Verify transaction is to our receiving wallet
    if (!RECEIVING_WALLET) {
      throw new Error('RECEIVING_WALLET is not configured');
    }
    if (!tx.to) {
      throw new Error('Transaction has no recipient address');
    }
    if (tx.to.toLowerCase() !== RECEIVING_WALLET.toLowerCase()) {
      throw new Error(`Transaction must be sent to ${RECEIVING_WALLET}`);
    }
    
    // Check transaction value
    const valueInMatic = ethers.formatEther(tx.value);
    const minBetAmount = parseFloat(BET_AMOUNT);
    
    if (parseFloat(valueInMatic) < minBetAmount) {
      throw new Error(`Transaction value must be at least ${BET_AMOUNT} MATIC`);
    }
    
    // Get block for timestamp
    const block = await provider.getBlock(tx.blockNumber);
    
    return {
      valid: true,
      transactionId: txId,
      fromAddress: tx.from,
      toAddress: tx.to,
      value: valueInMatic,
      blockNumber: tx.blockNumber,
      timestamp: new Date(block.timestamp * 1000),
      gasUsed: receipt.gasUsed.toString(),
      status: 'confirmed'
    };
    
  } catch (error) {
    console.error('Error validating transaction:', error.message);
    throw error;
  }
}

/**
 * Alternative validation using PolygonScan API
 * @param {string} txId - Transaction hash
 * @returns {Promise<Object>} Transaction details
 */
export async function validateTransactionViaAPI(txId) {
  try {
    if (!POLYGONSCAN_API_KEY) {
      console.warn('PolygonScan API key not configured, using RPC method');
      return await validateTransaction(txId);
    }
    
    const url = `https://api.polygonscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txId}&apikey=${POLYGONSCAN_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    const tx = response.data.result;
    
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    // Get receipt
    const receiptUrl = `https://api.polygonscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txId}&apikey=${POLYGONSCAN_API_KEY}`;
    const receiptResponse = await axios.get(receiptUrl);
    const receipt = receiptResponse.data.result;
    
    // Validate same as above
    if (!RECEIVING_WALLET) {
      throw new Error('RECEIVING_WALLET is not configured');
    }
    if (!tx.to) {
      throw new Error('Transaction has no recipient address');
    }
    if (tx.to.toLowerCase() !== RECEIVING_WALLET.toLowerCase()) {
      throw new Error(`Transaction must be sent to ${RECEIVING_WALLET}`);
    }
    
    const valueInMatic = ethers.formatEther(tx.value);
    if (parseFloat(valueInMatic) < parseFloat(BET_AMOUNT)) {
      throw new Error(`Transaction value must be at least ${BET_AMOUNT} MATIC`);
    }
    
    // Get block timestamp
    const blockUrl = `https://api.polygonscan.com/api?module=proxy&action=eth_getBlockByNumber&tag=${tx.blockNumber}&boolean=true&apikey=${POLYGONSCAN_API_KEY}`;
    const blockResponse = await axios.get(blockUrl);
    const block = blockResponse.data.result;
    
    return {
      valid: true,
      transactionId: txId,
      fromAddress: tx.from,
      toAddress: tx.to,
      value: valueInMatic,
      blockNumber: parseInt(tx.blockNumber, 16),
      timestamp: new Date(parseInt(block.timestamp, 16) * 1000),
      gasUsed: parseInt(receipt.gasUsed, 16).toString(),
      status: receipt.status === '0x1' ? 'confirmed' : 'failed'
    };
    
  } catch (error) {
    console.error('Error validating via API:', error.message);
    throw error;
  }
}

/**
 * Send payment to winner
 * @param {string} toAddress - Winner's address
 * @param {string} amount - Amount in MATIC
 * @returns {Promise<Object>} Transaction details
 */
export async function sendPayment(toAddress, amount) {
  try {
    if (!provider) initProvider();
    
    const privateKey = process.env.PAYOUT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Payout private key not configured');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceInMatic = ethers.formatEther(balance);
    
    if (parseFloat(balanceInMatic) < parseFloat(amount)) {
      throw new Error('Insufficient balance for payout');
    }
    
    // Send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount)
    });
    
    console.log(`💸 Payment sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    return {
      transactionId: tx.hash,
      to: toAddress,
      amount,
      blockNumber: receipt.blockNumber,
      status: 'confirmed'
    };
    
  } catch (error) {
    console.error('Error sending payment:', error.message);
    throw error;
  }
}

/**
 * Get MATIC balance of an address
 * @param {string} address - Wallet address
 * @returns {Promise<string>} Balance in MATIC
 */
export async function getBalance(address) {
  try {
    // Try using PolygonScan API V2 first (more reliable)
    if (POLYGONSCAN_API_KEY) {
      try {
        const url = `https://api.polygonscan.com/v2/api?chainid=137&module=account&action=balance&address=${address}&tag=latest&apikey=${POLYGONSCAN_API_KEY}`;
        const response = await axios.get(url);
        
        if (response.data.status === '1') {
          return ethers.formatEther(response.data.result);
        }
      } catch (apiError) {
        console.warn('PolygonScan API failed, falling back to RPC:', apiError.message);
      }
    }
    
    // Fallback to RPC provider
    if (!provider) initProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting balance:', error.message);
    throw error;
  }
}

/**
 * Get recent transactions to receiving wallet
 * @param {number} limit - Number of recent transactions to fetch
 * @returns {Promise<Array>} List of recent transactions
 */
// Helper function to add delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getRecentTransactions(limit = 10) {
  try {
    if (!provider) initProvider();
    
    console.log('🔎 Fetching recent transactions...');
    
    // Get recent block number
    const currentBlock = await provider.getBlockNumber();
    console.log(`📦 Current block: ${currentBlock}`);
    
    const transactions = [];
    const blocksToCheck = Math.min(50, limit * 5); // Reduced to 50 blocks (~1-2 minutes) to avoid RPC limits
    const delayMs = 100; // 100ms delay between requests to avoid rate limiting
    
    console.log(`📊 Checking last ${blocksToCheck} blocks with ${delayMs}ms delay...`);
    
    for (let i = 0; i < blocksToCheck && transactions.length < limit; i++) {
      try {
        const blockNumber = currentBlock - i;
        const block = await provider.getBlock(blockNumber, true);
        
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (typeof tx === 'object' && tx.to && tx.to.toLowerCase() === RECEIVING_WALLET.toLowerCase()) {
              const value = ethers.formatEther(tx.value);
              
              transactions.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: value,
                timestamp: new Date(block.timestamp * 1000),
                blockNumber: block.number,
                confirmations: currentBlock - block.number
              });
              
              console.log(`  💰 Found TX: ${value} MATIC from ${tx.from.substring(0, 10)}... (block ${blockNumber})`);
              
              if (transactions.length >= limit) break;
            }
          }
        }
        
        // Add delay to avoid overwhelming RPC
        if (i < blocksToCheck - 1) {
          await delay(delayMs);
        }
        
      } catch (blockError) {
        console.warn(`  ⚠️ Error on block ${currentBlock - i}: ${blockError.message}`);
        // Continue despite errors
      }
    }
    
    console.log(`✅ Found ${transactions.length} transactions in last ${blocksToCheck} blocks`);
    return transactions;
    
  } catch (error) {
    console.error('❌ Error getting recent transactions:', error.message);
    // Return empty array instead of throwing - allows the system to continue
    return [];
  }
}

// Alternative: Get transactions using PolygonScan API (deprecated, kept for reference)
export async function getRecentTransactionsViaAPI(limit = 10) {
  try {
    if (!POLYGONSCAN_API_KEY) {
      throw new Error('PolygonScan API key required for transaction monitoring');
    }
    
    // Try old V1 API (may be deprecated)
    const url = `https://api.polygonscan.com/api?module=account&action=txlist&address=${RECEIVING_WALLET}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${POLYGONSCAN_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== '1') {
      throw new Error(response.data.message || 'Failed to fetch transactions');
    }
    
    const transactions = response.data.result;
    
    // Filter and format transactions (for API version)
    return transactions
      .filter(tx => 
        tx.to.toLowerCase() === RECEIVING_WALLET.toLowerCase() &&
        tx.isError === '0' && // Only successful transactions
        parseFloat(ethers.formatEther(tx.value)) >= parseFloat(BET_AMOUNT)
      )
      .map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        blockNumber: parseInt(tx.blockNumber),
        confirmations: parseInt(tx.confirmations)
      }));
    
  } catch (error) {
    console.error('Error getting recent transactions via API:', error.message);
    throw error;
  }
}

/**
 * Monitor for a specific payment amount from any address
 * Useful for detecting pending payments
 * @param {string} expectedAmount - Expected amount in MATIC
 * @param {Date} since - Only check transactions after this time
 * @returns {Promise<Object|null>} Transaction if found, null otherwise
 */
export async function findPendingPayment(expectedAmount, since = null) {
  try {
    // Get recent transactions from blockchain
    const recentTxs = await getRecentTransactions(30);
    
    const expectedAmountFloat = parseFloat(expectedAmount);
    const tolerance = 0.01; // 0.01 MATIC tolerance
    
    console.log(`🔍 Searching for payment of ${expectedAmount} MATIC (tolerance: ${tolerance})`);
    console.log(`📊 Found ${recentTxs.length} recent transactions to check`);
    
    for (const tx of recentTxs) {
      const txAmount = parseFloat(tx.value);
      
      console.log(`  - TX ${tx.hash.substring(0, 10)}... : ${txAmount} MATIC`);
      
      // Check if amount matches (within tolerance)
      if (Math.abs(txAmount - expectedAmountFloat) <= tolerance) {
        // Check if transaction is recent enough
        if (since && tx.timestamp < since) {
          console.log(`    ⏰ Too old (before ${since})`);
          continue;
        }
        
        console.log(`    ✅ MATCH FOUND!`);
        return tx;
      }
    }
    
    console.log('❌ No matching payment found');
    return null;
    
  } catch (error) {
    console.error('Error finding pending payment:', error.message);
    throw error;
  }
}

// Initialize on module load
initProvider();



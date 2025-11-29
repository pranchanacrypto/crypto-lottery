#!/usr/bin/env node

/**
 * Script para verificar status da wallet
 * Execute: node check-wallet.js
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const WALLET_ADDRESS = process.env.RECEIVING_WALLET;
const RPC_URL = process.env.POLYGON_RPC || 'https://polygon-rpc.com';

async function checkWallet() {
  console.log('\n🔍 Verificando Wallet...\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Conectar ao provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('📡 RPC URL:', RPC_URL);
    console.log('📬 Endereço da Wallet:', WALLET_ADDRESS);
    
    if (!WALLET_ADDRESS || WALLET_ADDRESS === 'COLOQUE_SEU_ENDERECO_AQUI') {
      console.log('\n❌ ERRO: Configure RECEIVING_WALLET no arquivo .env\n');
      process.exit(1);
    }
    
    // Verificar conexão
    const network = await provider.getNetwork();
    console.log('🌐 Network:', network.name, '(Chain ID:', network.chainId.toString(), ')');
    
    // Obter saldo
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceInMatic = ethers.formatEther(balance);
    
    console.log('\n💰 SALDO ATUAL');
    console.log('   └─ ', balanceInMatic, 'MATIC');
    console.log('   └─ ', parseFloat(balanceInMatic).toFixed(2), 'MATIC');
    
    if (parseFloat(balanceInMatic) === 0) {
      console.log('\n⚠️  ATENÇÃO: Wallet está vazia!');
      console.log('   Para pagar vencedores, você precisa ter MATIC nesta wallet.\n');
    } else {
      console.log('\n✅ Wallet tem saldo suficiente!\n');
    }
    
    // Verificar transações recentes
    console.log('📊 Informações Adicionais:');
    
    const blockNumber = await provider.getBlockNumber();
    console.log('   └─ Último bloco:', blockNumber);
    
    // Tentar obter histórico (limitado em RPC público)
    try {
      const history = await provider.getTransactionCount(WALLET_ADDRESS);
      console.log('   └─ Total de transações:', history);
      
      if (history === 0) {
        console.log('\n📝 Esta wallet ainda não tem transações na blockchain.');
        console.log('   Ela aparecerá no explorer apenas após a primeira transação.\n');
      }
    } catch (e) {
      console.log('   └─ Histórico: não disponível via RPC público');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🔗 Ver no PolygonScan:');
    console.log(`   https://polygonscan.com/address/${WALLET_ADDRESS}\n`);
    
    // Verificar chave privada configurada
    const privateKey = process.env.PAYOUT_PRIVATE_KEY;
    if (!privateKey || privateKey === 'COLOQUE_SUA_CHAVE_PRIVADA_AQUI') {
      console.log('⚠️  ATENÇÃO: PAYOUT_PRIVATE_KEY não configurada no .env');
      console.log('   Você não conseguirá pagar vencedores sem a chave privada!\n');
    } else {
      console.log('✅ Chave privada configurada (oculta por segurança)\n');
      
      // Validar se a chave privada corresponde ao endereço
      try {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() === WALLET_ADDRESS.toLowerCase()) {
          console.log('✅ Chave privada corresponde ao endereço configurado\n');
        } else {
          console.log('⚠️  ATENÇÃO: Chave privada NÃO corresponde ao RECEIVING_WALLET');
          console.log('   Endereço da chave:', wallet.address);
          console.log('   Endereço configurado:', WALLET_ADDRESS);
          console.log('   Isso pode ser intencional se você usar wallets separadas.\n');
        }
      } catch (e) {
        console.log('❌ Chave privada inválida no .env\n');
      }
    }
    
  } catch (error) {
    console.log('\n❌ ERRO:', error.message, '\n');
    process.exit(1);
  }
}

checkWallet();


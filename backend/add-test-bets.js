#!/usr/bin/env node

/**
 * Script para adicionar apostas de teste
 * Execute: node add-test-bets.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bet from './src/models/Bet.js';
import Round from './src/models/Round.js';

dotenv.config();

async function addTestBets() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-lottery');
    console.log('✅ Conectado!\n');
    
    // Get or create current round
    let currentRound = await Round.findOne({ isFinalized: false });
    
    if (!currentRound) {
      console.log('📝 Criando novo round...');
      
      // Calculate next draw date (Mon/Wed/Sat at 10:59 PM ET)
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
      
      currentRound = await Round.create({
        roundId: 1,
        startTime: new Date(),
        drawDate: nextDraw,
        totalBets: 0,
        isFinalized: false,
        accumulatedAmount: '0'
      });
      
      console.log(`✅ Round #${currentRound.roundId} criado!`);
      console.log(`   Data do sorteio: ${nextDraw}\n`);
    } else {
      console.log(`📍 Round atual: #${currentRound.roundId}`);
      console.log(`   Data do sorteio: ${currentRound.drawDate}`);
      console.log(`   Apostas atuais: ${currentRound.totalBets}\n`);
    }
    
    // Create test bets
    const testBets = [
      {
        numbers: [5, 12, 23, 34, 45, 56],
        nickname: 'TestPlayer1',
        transactionValue: '0.1'
      },
      {
        numbers: [1, 2, 3, 4, 5, 6],
        nickname: 'TestPlayer2',
        transactionValue: '0.1'
      },
      {
        numbers: [10, 20, 30, 40, 50, 60],
        nickname: 'Lucky7',
        transactionValue: '0.15'
      },
      {
        numbers: [7, 14, 21, 28, 35, 42],
        nickname: 'Anonymous',
        transactionValue: '0.1'
      },
      {
        numbers: [3, 13, 23, 33, 43, 53],
        nickname: 'CryptoFan',
        transactionValue: '0.2'
      }
    ];
    
    console.log('💰 Adicionando apostas de teste...\n');
    
    let totalValue = 0;
    
    for (let i = 0; i < testBets.length; i++) {
      const betData = testBets[i];
      
      const bet = await Bet.create({
        numbers: betData.numbers,
        transactionId: `test-tx-${Date.now()}-${i}`,
        nickname: betData.nickname,
        roundId: currentRound.roundId,
        fromAddress: `0xTest${String(i + 1).padStart(40, '0')}`,
        transactionValue: betData.transactionValue,
        transactionTimestamp: new Date(),
        isValidated: true, // ✅ IMPORTANTE: marcar como validada
        validationError: null,
        betPlacedAt: new Date()
      });
      
      totalValue += parseFloat(betData.transactionValue);
      
      console.log(`✅ Aposta ${i + 1}:`);
      console.log(`   Jogador: ${betData.nickname}`);
      console.log(`   Números: [${betData.numbers.join(', ')}]`);
      console.log(`   Valor: ${betData.transactionValue} MATIC`);
      console.log('');
    }
    
    // Update round
    currentRound.totalBets += testBets.length;
    await currentRound.save();
    
    console.log('═══════════════════════════════════════════');
    console.log('✅ RESUMO');
    console.log('═══════════════════════════════════════════');
    console.log(`Total de apostas: ${testBets.length}`);
    console.log(`Valor total: ${totalValue.toFixed(2)} MATIC`);
    console.log(`Prize Pool (80%): ${(totalValue * 0.8).toFixed(2)} MATIC`);
    console.log(`Acumulado (15%): ${(totalValue * 0.15).toFixed(2)} MATIC`);
    console.log(`Taxa Casa (5%): ${(totalValue * 0.05).toFixed(2)} MATIC`);
    console.log('═══════════════════════════════════════════\n');
    
    console.log('🎉 Apostas de teste adicionadas com sucesso!');
    console.log('🌐 Acesse o frontend para ver o prize pool atualizado!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

addTestBets();


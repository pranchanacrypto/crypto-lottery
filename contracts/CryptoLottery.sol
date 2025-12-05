// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CryptoLottery
 * @dev Decentralized lottery system with 6 numbers (1-60)
 * @notice This contract handles lottery draws, winner calculation, and prize distribution
 */
contract CryptoLottery {
    
    // Structs
    struct Bet {
        address player;
        uint8[6] numbers;
        uint256 roundId;
        uint256 timestamp;
    }
    
    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 drawTime;
        uint8[6] winningNumbers;
        bool isFinalized;
        uint256 totalBets;
        uint256 prizePool;
        uint256 accumulatedAmount;
    }
    
    struct Winner {
        address player;
        uint8 matches;
        uint256 prizeAmount;
        bool paid;
    }
    
    // State variables
    address public owner;
    address public receivingWallet;
    uint256 public betAmount;
    uint256 public currentRoundId;
    
    // Prize distribution percentages (in basis points, 10000 = 100%)
    uint256 public constant HOUSE_FEE = 500;           // 5%
    uint256 public constant WINNER_PERCENTAGE = 8000;  // 80%
    uint256 public constant ROLLOVER_PERCENTAGE = 1500; // 15%
    
    // Mappings
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => Bet[]) public roundBets;
    mapping(uint256 => Winner[]) public roundWinners;
    mapping(bytes32 => bool) public usedTransactions;
    
    // Events
    event BetPlaced(address indexed player, uint256 indexed roundId, uint8[6] numbers);
    event RoundFinalized(uint256 indexed roundId, uint8[6] winningNumbers);
    event PrizeDistributed(address indexed winner, uint256 amount, uint8 matches);
    event NewRoundStarted(uint256 indexed roundId, uint256 drawTime);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier validNumbers(uint8[6] memory numbers) {
        for (uint i = 0; i < 6; i++) {
            require(numbers[i] >= 1 && numbers[i] <= 60, "Numbers must be between 1 and 60");
            // Check for duplicates
            for (uint j = i + 1; j < 6; j++) {
                require(numbers[i] != numbers[j], "Numbers must be unique");
            }
        }
        _;
    }
    
    constructor(address _receivingWallet, uint256 _betAmount) {
        owner = msg.sender;
        receivingWallet = _receivingWallet;
        betAmount = _betAmount;
        currentRoundId = 1;
        
        // Start first round
        _startNewRound();
    }
    
    /**
     * @dev Place a single bet
     * @param numbers Array of 6 numbers (1-60)
     * @param txHash Transaction hash for verification
     */
    function placeBet(uint8[6] memory numbers, bytes32 txHash) 
        external 
        payable 
        validNumbers(numbers) 
    {
        require(!usedTransactions[txHash], "Transaction already used");
        require(msg.value >= betAmount, "Insufficient bet amount");
        require(!rounds[currentRoundId].isFinalized, "Round already finalized");
        require(block.timestamp < rounds[currentRoundId].drawTime, "Round closed for betting");
        
        usedTransactions[txHash] = true;
        
        Bet memory newBet = Bet({
            player: msg.sender,
            numbers: numbers,
            roundId: currentRoundId,
            timestamp: block.timestamp
        });
        
        roundBets[currentRoundId].push(newBet);
        rounds[currentRoundId].totalBets++;
        rounds[currentRoundId].prizePool += msg.value;
        
        emit BetPlaced(msg.sender, currentRoundId, numbers);
    }
    
    /**
     * @dev Place multiple bets at once
     * @param bets Array of number combinations
     * @param txHash Transaction hash for verification
     */
    function placeMultipleBets(uint8[6][] memory bets, bytes32 txHash) 
        external 
        payable 
    {
        require(!usedTransactions[txHash], "Transaction already used");
        require(bets.length > 0 && bets.length <= 100, "1-100 bets allowed");
        require(msg.value >= betAmount * bets.length, "Insufficient bet amount");
        require(!rounds[currentRoundId].isFinalized, "Round already finalized");
        require(block.timestamp < rounds[currentRoundId].drawTime, "Round closed for betting");
        
        usedTransactions[txHash] = true;
        
        for (uint i = 0; i < bets.length; i++) {
            // Validate numbers
            for (uint j = 0; j < 6; j++) {
                require(bets[i][j] >= 1 && bets[i][j] <= 60, "Numbers must be between 1 and 60");
                for (uint k = j + 1; k < 6; k++) {
                    require(bets[i][j] != bets[i][k], "Numbers must be unique");
                }
            }
            
            Bet memory newBet = Bet({
                player: msg.sender,
                numbers: bets[i],
                roundId: currentRoundId,
                timestamp: block.timestamp
            });
            
            roundBets[currentRoundId].push(newBet);
            emit BetPlaced(msg.sender, currentRoundId, bets[i]);
        }
        
        rounds[currentRoundId].totalBets += bets.length;
        rounds[currentRoundId].prizePool += msg.value;
    }
    
    /**
     * @dev Execute lottery draw and distribute prizes
     * @param seed Random seed for generating winning numbers
     */
    function executeDraw(uint256 seed) external onlyOwner {
        require(!rounds[currentRoundId].isFinalized, "Round already finalized");
        require(block.timestamp >= rounds[currentRoundId].drawTime, "Too early to draw");
        
        // Generate winning numbers
        uint8[6] memory winningNumbers = _generateWinningNumbers(seed);
        rounds[currentRoundId].winningNumbers = winningNumbers;
        
        // Calculate winners
        _calculateWinners(currentRoundId);
        
        // Distribute prizes
        _distributePrizes(currentRoundId);
        
        // Finalize round
        rounds[currentRoundId].isFinalized = true;
        
        emit RoundFinalized(currentRoundId, winningNumbers);
        
        // Start next round
        currentRoundId++;
        _startNewRound();
    }
    
    /**
     * @dev Generate winning numbers using seed
     */
    function _generateWinningNumbers(uint256 seed) private view returns (uint8[6] memory) {
        uint8[6] memory numbers;
        uint256 randomHash = uint256(keccak256(abi.encodePacked(
            seed,
            block.timestamp,
            block.prevrandao,
            currentRoundId
        )));
        
        for (uint i = 0; i < 6; i++) {
            uint8 num;
            bool unique;
            uint attempts = 0;
            
            do {
                unique = true;
                num = uint8((uint256(keccak256(abi.encodePacked(randomHash, i, attempts))) % 60) + 1);
                
                // Check if number is unique
                for (uint j = 0; j < i; j++) {
                    if (numbers[j] == num) {
                        unique = false;
                        break;
                    }
                }
                attempts++;
            } while (!unique && attempts < 100);
            
            numbers[i] = num;
        }
        
        return numbers;
    }
    
    /**
     * @dev Calculate winners for the round
     */
    function _calculateWinners(uint256 roundId) private {
        Bet[] storage bets = roundBets[roundId];
        uint8[6] memory winningNumbers = rounds[roundId].winningNumbers;
        
        uint8 maxMatches = 0;
        
        // First pass: find maximum matches
        for (uint i = 0; i < bets.length; i++) {
            uint8 matches = _countMatches(bets[i].numbers, winningNumbers);
            if (matches > maxMatches) {
                maxMatches = matches;
            }
        }
        
        // Second pass: collect all winners with max matches
        if (maxMatches > 0) {
            for (uint i = 0; i < bets.length; i++) {
                uint8 matches = _countMatches(bets[i].numbers, winningNumbers);
                if (matches == maxMatches) {
                    Winner memory winner = Winner({
                        player: bets[i].player,
                        matches: matches,
                        prizeAmount: 0, // Will be calculated in distribution
                        paid: false
                    });
                    roundWinners[roundId].push(winner);
                }
            }
        }
    }
    
    /**
     * @dev Count matching numbers
     */
    function _countMatches(uint8[6] memory betNumbers, uint8[6] memory winningNumbers) 
        private 
        pure 
        returns (uint8) 
    {
        uint8 matches = 0;
        for (uint i = 0; i < 6; i++) {
            for (uint j = 0; j < 6; j++) {
                if (betNumbers[i] == winningNumbers[j]) {
                    matches++;
                    break;
                }
            }
        }
        return matches;
    }
    
    /**
     * @dev Distribute prizes to winners
     */
    function _distributePrizes(uint256 roundId) private {
        Round storage round = rounds[roundId];
        Winner[] storage winners = roundWinners[roundId];
        
        if (winners.length == 0) {
            // No winners - rollover everything to next round
            uint256 rollover = round.prizePool + round.accumulatedAmount;
            if (currentRoundId + 1 <= type(uint256).max) {
                rounds[currentRoundId + 1].accumulatedAmount = rollover;
            }
            return;
        }
        
        uint256 totalPool = round.prizePool;
        uint256 houseFee = (totalPool * HOUSE_FEE) / 10000;
        uint256 rollover = (totalPool * ROLLOVER_PERCENTAGE) / 10000;
        uint256 prizePool = (totalPool * WINNER_PERCENTAGE) / 10000 + round.accumulatedAmount;
        
        // Send house fee
        payable(receivingWallet).transfer(houseFee);
        
        // Set rollover for next round
        if (currentRoundId + 1 <= type(uint256).max) {
            rounds[currentRoundId + 1].accumulatedAmount = rollover;
        }
        
        // Distribute prizes among winners
        uint256 prizePerWinner = prizePool / winners.length;
        
        for (uint i = 0; i < winners.length; i++) {
            winners[i].prizeAmount = prizePerWinner;
            winners[i].paid = true;
            
            payable(winners[i].player).transfer(prizePerWinner);
            
            emit PrizeDistributed(winners[i].player, prizePerWinner, winners[i].matches);
        }
    }
    
    /**
     * @dev Start a new round
     */
    function _startNewRound() private {
        uint256 nextDrawTime = _getNextSundayAt22UTC();
        
        rounds[currentRoundId] = Round({
            roundId: currentRoundId,
            startTime: block.timestamp,
            drawTime: nextDrawTime,
            winningNumbers: [0, 0, 0, 0, 0, 0],
            isFinalized: false,
            totalBets: 0,
            prizePool: 0,
            accumulatedAmount: 0
        });
        
        emit NewRoundStarted(currentRoundId, nextDrawTime);
    }
    
    /**
     * @dev Calculate next Sunday at 22:00 UTC
     */
    function _getNextSundayAt22UTC() private view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 dayOfWeek = ((currentTime / 86400) + 4) % 7; // 0 = Sunday
        
        uint256 daysUntilSunday;
        if (dayOfWeek == 0) {
            // If today is Sunday, check if it's before 22:00
            uint256 todayAt22 = (currentTime / 86400) * 86400 + 22 hours;
            if (currentTime < todayAt22) {
                return todayAt22;
            } else {
                daysUntilSunday = 7;
            }
        } else {
            daysUntilSunday = 7 - dayOfWeek;
        }
        
        uint256 nextSunday = currentTime + (daysUntilSunday * 1 days);
        uint256 nextSundayAt22 = (nextSunday / 86400) * 86400 + 22 hours;
        
        return nextSundayAt22;
    }
    
    // View functions
    function getCurrentRound() external view returns (Round memory) {
        return rounds[currentRoundId];
    }
    
    function getRoundBets(uint256 roundId) external view returns (Bet[] memory) {
        return roundBets[roundId];
    }
    
    function getRoundWinners(uint256 roundId) external view returns (Winner[] memory) {
        return roundWinners[roundId];
    }
    
    function getBetCount(uint256 roundId) external view returns (uint256) {
        return roundBets[roundId].length;
    }
    
    // Owner functions
    function updateBetAmount(uint256 newAmount) external onlyOwner {
        betAmount = newAmount;
    }
    
    function updateReceivingWallet(address newWallet) external onlyOwner {
        receivingWallet = newWallet;
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}


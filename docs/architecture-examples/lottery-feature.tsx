/**
 * КАЙФ-ЛОТЕРЕЯ - Модуль криптолотерей и розыгрышей
 * Lottery feature with blockchain integration and instant win games
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import Web3 from 'web3';
import { ethers } from 'ethers';

// Типы для лотереи
interface Lottery {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'instant' | 'charity' | 'mega';
  jackpot: {
    amount: number;
    currency: 'TON' | 'ETH' | 'USDT';
  };
  ticketPrice: number;
  totalTickets: number;
  soldTickets: number;
  endTime: Date;
  winners: Winner[];
  status: 'active' | 'drawing' | 'completed';
  smartContractAddress?: string;
  charityPercentage?: number;
}

interface Ticket {
  id: string;
  lotteryId: string;
  userId: string;
  numbers: number[];
  purchaseTime: Date;
  transactionHash: string;
  status: 'pending' | 'active' | 'winning' | 'losing';
}

interface Winner {
  userId: string;
  prize: number;
  position: number;
  ticketId: string;
}

interface InstantGame {
  id: string;
  name: string;
  type: 'scratch' | 'wheel' | 'slots' | 'dice';
  minBet: number;
  maxBet: number;
  maxWin: number;
  houseEdge: number;
}

/**
 * Smart Contract для лотереи (Solidity)
 */
const LOTTERY_CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "_ticketPrice", "type": "uint256"},
      {"name": "_endTime", "type": "uint256"},
      {"name": "_charityPercentage", "type": "uint256"}
    ],
    "name": "createLottery",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "inputs": [
      {"name": "_lotteryId", "type": "uint256"},
      {"name": "_ticketCount", "type": "uint256"}
    ],
    "name": "buyTickets",
    "outputs": [],
    "payable": true,
    "type": "function"
  },
  {
    "inputs": [{"name": "_lotteryId", "type": "uint256"}],
    "name": "drawWinner",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [{"name": "_lotteryId", "type": "uint256"}],
    "name": "getLotteryInfo",
    "outputs": [
      {"name": "jackpot", "type": "uint256"},
      {"name": "totalTickets", "type": "uint256"},
      {"name": "endTime", "type": "uint256"},
      {"name": "winner", "type": "address"},
      {"name": "isCompleted", "type": "bool"}
    ],
    "type": "function"
  }
];

/**
 * Главный компонент лотереи
 */
export const LotteryFeature: React.FC = () => {
  const [activeLotteries, setActiveLotteries] = useState<Lottery[]>([]);
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [selectedLottery, setSelectedLottery] = useState<Lottery | null>(null);
  const [instantGames, setInstantGames] = useState<InstantGame[]>([]);
  const [balance, setBalance] = useState({ TON: 100, ETH: 0.1, USDT: 500 });

  /**
   * Покупка билетов через блокчейн
   */
  const buyTickets = async (lottery: Lottery, ticketCount: number) => {
    try {
      if (!window.ethereum) {
        alert('Установите MetaMask для покупки билетов');
        return;
      }

      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();

      const contract = new web3.eth.Contract(
        LOTTERY_CONTRACT_ABI,
        lottery.smartContractAddress
      );

      const totalPrice = lottery.ticketPrice * ticketCount;
      const priceInWei = web3.utils.toWei(totalPrice.toString(), 'ether');

      const tx = await contract.methods
        .buyTickets(lottery.id, ticketCount)
        .send({
          from: accounts[0],
          value: priceInWei,
          gas: 300000
        });

      // Сохранение билетов
      const newTickets: Ticket[] = [];
      for (let i = 0; i < ticketCount; i++) {
        newTickets.push({
          id: `${tx.transactionHash}-${i}`,
          lotteryId: lottery.id,
          userId: accounts[0],
          numbers: generateRandomNumbers(),
          purchaseTime: new Date(),
          transactionHash: tx.transactionHash,
          status: 'active'
        });
      }

      setUserTickets([...userTickets, ...newTickets]);
      alert(`Успешно куплено ${ticketCount} билетов!`);
    } catch (error) {
      console.error('Ошибка покупки билетов:', error);
      alert('Ошибка при покупке билетов');
    }
  };

  /**
   * Генерация случайных чисел для билета
   */
  const generateRandomNumbers = (): number[] => {
    const numbers: number[] = [];
    while (numbers.length < 6) {
      const num = Math.floor(Math.random() * 49) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  /**
   * Карусель активных лотерей
   */
  const LotteryCarousel: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const lotteries: Lottery[] = [
      {
        id: '1',
        name: 'Мега Джекпот',
        type: 'mega',
        jackpot: { amount: 1000000, currency: 'USDT' },
        ticketPrice: 10,
        totalTickets: 100000,
        soldTickets: 45230,
        endTime: new Date('2025-02-01'),
        winners: [],
        status: 'active'
      },
      {
        id: '2',
        name: 'Ежедневная TON',
        type: 'daily',
        jackpot: { amount: 500, currency: 'TON' },
        ticketPrice: 1,
        totalTickets: 1000,
        soldTickets: 732,
        endTime: new Date('2025-01-22'),
        winners: [],
        status: 'active'
      },
      {
        id: '3',
        name: 'Благотворительная',
        type: 'charity',
        jackpot: { amount: 10000, currency: 'USDT' },
        ticketPrice: 5,
        totalTickets: 5000,
        soldTickets: 2341,
        endTime: new Date('2025-01-25'),
        winners: [],
        status: 'active',
        charityPercentage: 30
      }
    ];

    return (
      <View style={styles.carousel}>
        <Text style={styles.sectionTitle}>🎰 Активные розыгрыши</Text>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {lotteries.map((lottery) => (
            <View key={lottery.id} style={styles.lotteryCard}>
              <View style={styles.lotteryHeader}>
                <Text style={styles.lotteryName}>{lottery.name}</Text>
                {lottery.type === 'charity' && (
                  <View style={styles.charityBadge}>
                    <Text style={styles.charityText}>❤️ {lottery.charityPercentage}% на благотворительность</Text>
                  </View>
                )}
              </View>

              <View style={styles.jackpotContainer}>
                <Text style={styles.jackpotLabel}>ДЖЕКПОТ</Text>
                <Text style={styles.jackpotAmount}>
                  {lottery.jackpot.amount.toLocaleString()} {lottery.jackpot.currency}
                </Text>
                <Text style={styles.jackpotUSD}>
                  ≈ ${(lottery.jackpot.amount * (lottery.jackpot.currency === 'TON' ? 2.5 : 1)).toLocaleString()}
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${(lottery.soldTickets / lottery.totalTickets) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Продано: {lottery.soldTickets} / {lottery.totalTickets}
                </Text>
              </View>

              <View style={styles.lotteryInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Цена билета</Text>
                  <Text style={styles.infoValue}>{lottery.ticketPrice} {lottery.jackpot.currency}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>До розыгрыша</Text>
                  <CountdownTimer endTime={lottery.endTime} />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.buyButton}
                onPress={() => setSelectedLottery(lottery)}
              >
                <Text style={styles.buyButtonText}>Купить билеты</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Таймер обратного отсчета
   */
  const CountdownTimer: React.FC<{ endTime: Date }> = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime.getTime() - now;

        if (distance < 0) {
          setTimeLeft('Розыгрыш!');
          clearInterval(timer);
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          
          setTimeLeft(`${days}д ${hours}ч ${minutes}м`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }, [endTime]);

    return <Text style={styles.infoValue}>{timeLeft}</Text>;
  };

  /**
   * Секция моментальных игр
   */
  const InstantGamesSection: React.FC = () => {
    const games: InstantGame[] = [
      {
        id: '1',
        name: 'Лотерейная карточка',
        type: 'scratch',
        minBet: 0.1,
        maxBet: 100,
        maxWin: 10000,
        houseEdge: 5
      },
      {
        id: '2',
        name: 'Колесо фортуны',
        type: 'wheel',
        minBet: 0.5,
        maxBet: 50,
        maxWin: 5000,
        houseEdge: 3
      },
      {
        id: '3',
        name: 'Крипто-слоты',
        type: 'slots',
        minBet: 0.1,
        maxBet: 100,
        maxWin: 100000,
        houseEdge: 2
      },
      {
        id: '4',
        name: 'Кости удачи',
        type: 'dice',
        minBet: 0.1,
        maxBet: 50,
        maxWin: 600,
        houseEdge: 1
      }
    ];

    return (
      <View style={styles.instantGames}>
        <Text style={styles.sectionTitle}>⚡ Моментальные игры</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {games.map((game) => (
            <TouchableOpacity key={game.id} style={styles.gameCard}>
              <Text style={styles.gameIcon}>
                {game.type === 'scratch' && '🎫'}
                {game.type === 'wheel' && '🎡'}
                {game.type === 'slots' && '🎰'}
                {game.type === 'dice' && '🎲'}
              </Text>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameMaxWin}>Макс. выигрыш: x{game.maxWin / game.minBet}</Text>
              <TouchableOpacity style={styles.playButton}>
                <Text style={styles.playButtonText}>Играть</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * История выигрышей
   */
  const WinnersHistory: React.FC = () => {
    const winners = [
      { user: '@alex***', amount: 50000, currency: 'USDT', lottery: 'Мега Джекпот', date: new Date('2025-01-15') },
      { user: '@maria***', amount: 1000, currency: 'TON', lottery: 'Ежедневная', date: new Date('2025-01-20') },
      { user: '@ivan***', amount: 5000, currency: 'USDT', lottery: 'Недельная', date: new Date('2025-01-18') }
    ];

    return (
      <View style={styles.winnersSection}>
        <Text style={styles.sectionTitle}>🏆 Последние победители</Text>
        {winners.map((winner, index) => (
          <View key={index} style={styles.winnerCard}>
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerName}>{winner.user}</Text>
              <Text style={styles.winnerLottery}>{winner.lottery}</Text>
              <Text style={styles.winnerDate}>
                {winner.date.toLocaleDateString('ru-RU')}
              </Text>
            </View>
            <View style={styles.winnerPrize}>
              <Text style={styles.prizeAmount}>
                {winner.amount.toLocaleString()} {winner.currency}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  /**
   * Мои билеты
   */
  const MyTicketsSection: React.FC = () => (
    <View style={styles.ticketsSection}>
      <Text style={styles.sectionTitle}>🎟️ Мои билеты</Text>
      {userTickets.length === 0 ? (
        <Text style={styles.noTicketsText}>У вас пока нет билетов</Text>
      ) : (
        userTickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketNumbers}>
              {ticket.numbers.map((num) => (
                <View key={num} style={styles.numberBall}>
                  <Text style={styles.numberText}>{num}</Text>
                </View>
              ))}
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketLottery}>Лотерея #{ticket.lotteryId}</Text>
              <Text style={styles.ticketStatus}>
                Статус: {ticket.status === 'active' ? 'Активен' : ticket.status}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  /**
   * Статистика и аналитика
   */
  const StatisticsSection: React.FC = () => (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>📊 Статистика платформы</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>$2,345,678</Text>
          <Text style={styles.statLabel}>Общий призовой фонд</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>15,234</Text>
          <Text style={styles.statLabel}>Активных игроков</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>$567,890</Text>
          <Text style={styles.statLabel}>Выплачено за месяц</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>98.5%</Text>
          <Text style={styles.statLabel}>RTP (Return to Player)</Text>
        </View>
      </View>
    </View>
  );

  // Главный рендер
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎰 КАЙФ-ЛОТЕРЕЯ</Text>
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Баланс:</Text>
          <Text style={styles.balanceAmount}>{balance.TON} TON</Text>
        </View>
      </View>

      <LotteryCarousel />
      <InstantGamesSection />
      <WinnersHistory />
      <MyTicketsSection />
      <StatisticsSection />

      {/* Модальное окно покупки билетов */}
      {selectedLottery && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Купить билеты</Text>
            <Text style={styles.modalLottery}>{selectedLottery.name}</Text>
            
            <View style={styles.ticketSelector}>
              <TouchableOpacity style={styles.ticketOption}>
                <Text>1 билет</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ticketOption}>
                <Text>5 билетов</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ticketOption}>
                <Text>10 билетов</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => buyTickets(selectedLottery, 1)}
            >
              <Text style={styles.confirmButtonText}>Подтвердить покупку</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setSelectedLottery(null)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

// Стили
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e1621'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2f3a45'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  balanceLabel: {
    color: '#8b9398',
    marginRight: 8
  },
  balanceAmount: {
    color: '#0088cc',
    fontWeight: 'bold',
    fontSize: 16
  },
  carousel: {
    marginVertical: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 16,
    marginBottom: 12
  },
  lotteryCard: {
    width: 320,
    backgroundColor: '#17212b',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 8
  },
  lotteryHeader: {
    marginBottom: 16
  },
  lotteryName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  charityBadge: {
    backgroundColor: '#ff4458',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8
  },
  charityText: {
    color: '#fff',
    fontSize: 12
  },
  jackpotContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#0e1621',
    borderRadius: 12
  },
  jackpotLabel: {
    color: '#8b9398',
    fontSize: 12,
    marginBottom: 8
  },
  jackpotAmount: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: 'bold'
  },
  jackpotUSD: {
    color: '#8b9398',
    fontSize: 14,
    marginTop: 4
  },
  progressContainer: {
    marginVertical: 16
  },
  progressBar: {
    height: 8,
    backgroundColor: '#0e1621',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0088cc',
    borderRadius: 4
  },
  progressText: {
    color: '#8b9398',
    fontSize: 12,
    marginTop: 8
  },
  lotteryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  infoItem: {
    flex: 1
  },
  infoLabel: {
    color: '#8b9398',
    fontSize: 12,
    marginBottom: 4
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  buyButton: {
    backgroundColor: '#0088cc',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  instantGames: {
    marginVertical: 20
  },
  gameCard: {
    width: 140,
    backgroundColor: '#17212b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center'
  },
  gameIcon: {
    fontSize: 40,
    marginBottom: 8
  },
  gameName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4
  },
  gameMaxWin: {
    color: '#ffd700',
    fontSize: 12,
    marginBottom: 12
  },
  playButton: {
    backgroundColor: '#44d362',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  winnersSection: {
    marginVertical: 20,
    paddingHorizontal: 16
  },
  winnerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#17212b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  winnerInfo: {
    flex: 1
  },
  winnerName: {
    color: '#fff',
    fontWeight: 'bold'
  },
  winnerLottery: {
    color: '#8b9398',
    fontSize: 12
  },
  winnerDate: {
    color: '#8b9398',
    fontSize: 10
  },
  winnerPrize: {
    justifyContent: 'center'
  },
  prizeAmount: {
    color: '#ffd700',
    fontWeight: 'bold'
  },
  ticketsSection: {
    marginVertical: 20,
    paddingHorizontal: 16
  },
  noTicketsText: {
    color: '#8b9398',
    textAlign: 'center',
    marginVertical: 20
  },
  ticketCard: {
    backgroundColor: '#17212b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  ticketNumbers: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12
  },
  numberBall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0088cc',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4
  },
  numberText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  ticketInfo: {
    alignItems: 'center'
  },
  ticketLottery: {
    color: '#fff',
    marginBottom: 4
  },
  ticketStatus: {
    color: '#44d362',
    fontSize: 12
  },
  statsSection: {
    marginVertical: 20,
    paddingHorizontal: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statCard: {
    width: '48%',
    backgroundColor: '#17212b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center'
  },
  statValue: {
    color: '#0088cc',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statLabel: {
    color: '#8b9398',
    fontSize: 12,
    textAlign: 'center'
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#17212b',
    padding: 24,
    borderRadius: 16,
    width: '90%'
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8
  },
  modalLottery: {
    color: '#8b9398',
    marginBottom: 20
  },
  ticketSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  ticketOption: {
    backgroundColor: '#2b5278',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  confirmButton: {
    backgroundColor: '#0088cc',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#8b9398'
  }
});

export default LotteryFeature;
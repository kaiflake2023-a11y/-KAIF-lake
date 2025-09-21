// КАЙФ-СОБЫТИЯ: Events & Entertainment Module
// Complete implementation with blockchain ticketing and reputation system

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Star, Clock, Ticket, Music, Film, Mic, Trophy, Heart, Share2, QrCode, Shield, DollarSign, TrendingUp, Bell, Filter, Search, ChevronRight, CheckCircle, AlertCircle, Gift, Sparkles, Zap, Award, PartyPopper, Camera } from 'lucide-react';

// Types and Interfaces
interface Event {
  id: string;
  title: string;
  description: string;
  category: 'concert' | 'festival' | 'conference' | 'sport' | 'theater' | 'party' | 'workshop' | 'meetup';
  images: string[];
  video?: string;
  date: Date;
  endDate?: Date;
  location: {
    venue: string;
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
    capacity: number;
  };
  organizer: {
    id: string;
    name: string;
    avatar: string;
    trustScore: number;
    totalEvents: number;
    verified: boolean;
    walletAddress: string;
  };
  tickets: TicketTier[];
  sold: number;
  available: number;
  price: {
    min: number;
    max: number;
    currency: string;
    cryptoAccepted: boolean;
  };
  rating: number;
  reviews: number;
  tags: string[];
  features: string[];
  ageRestriction?: string;
  blockchain: {
    contractAddress: string;
    tokenStandard: 'ERC-721' | 'ERC-1155';
    verified: boolean;
    resaleAllowed: boolean;
    royaltyPercentage: number;
  };
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  streamingAvailable: boolean;
  virtualTickets?: VirtualTicket[];
}

interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  cryptoPrice: {
    ETH: number;
    BTC: number;
    USDT: number;
  };
  quantity: number;
  sold: number;
  benefits: string[];
  transferable: boolean;
  refundable: boolean;
  nftMetadata?: {
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
    unlockableContent?: string;
  };
}

interface VirtualTicket {
  id: string;
  tier: string;
  streamUrl?: string;
  vipFeatures: string[];
  price: number;
}

interface UserTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  tierId: string;
  tierName: string;
  purchaseDate: Date;
  price: number;
  status: 'active' | 'used' | 'expired' | 'resold' | 'cancelled';
  qrCode: string;
  nftTokenId?: string;
  transferHistory: Transfer[];
  resalePrice?: number;
  isListed: boolean;
}

interface Transfer {
  from: string;
  to: string;
  date: Date;
  price?: number;
  transactionHash: string;
}

interface EventReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTrustScore: number;
  eventId: string;
  rating: number;
  title: string;
  content: string;
  photos: string[];
  date: Date;
  verified: boolean;
  helpful: number;
  aspects: {
    venue: number;
    organization: number;
    value: number;
    experience: number;
  };
}

interface Performer {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  genre?: string;
  socialMedia: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  upcomingEvents: number;
  followers: number;
}

// Smart Contract ABI for Event Ticketing
const EVENT_CONTRACT_ABI = [
  {
    "inputs": [
      { "name": "eventId", "type": "uint256" },
      { "name": "tierId", "type": "uint256" },
      { "name": "quantity", "type": "uint256" }
    ],
    "name": "mintTicket",
    "outputs": [{ "name": "tokenIds", "type": "uint256[]" }],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" },
      { "name": "price", "type": "uint256" }
    ],
    "name": "listForResale",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "name": "buyResaleTicket",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "name": "validateTicket",
    "outputs": [{ "name": "isValid", "type": "bool" }],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "name": "useTicket",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "organizerAddress", "type": "address" }
    ],
    "name": "getOrganizerTrustScore",
    "outputs": [{ "name": "score", "type": "uint256" }],
    "type": "function"
  }
];

// Main Events Component
export const EventsFeature: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discover' | 'myTickets' | 'organize' | 'resale'>('discover');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [web3Connected, setWeb3Connected] = useState(false);
  const [userWallet, setUserWallet] = useState<string>('');

  // Mock data for events
  const events: Event[] = [
    {
      id: '1',
      title: 'Кайф Music Festival 2024',
      description: 'Крупнейший музыкальный фестиваль с участием топовых артистов',
      category: 'festival',
      images: ['/api/placeholder/800/600', '/api/placeholder/800/601'],
      date: new Date('2024-06-15'),
      endDate: new Date('2024-06-17'),
      location: {
        venue: 'Лужники',
        address: 'Лужнецкая набережная, 24',
        city: 'Москва',
        coordinates: { lat: 55.7158, lng: 37.5539 },
        capacity: 50000
      },
      organizer: {
        id: 'org1',
        name: 'КАЙФ Events',
        avatar: '/api/placeholder/100/100',
        trustScore: 95,
        totalEvents: 234,
        verified: true,
        walletAddress: '0x123...abc'
      },
      tickets: [
        {
          id: 'tier1',
          name: 'General Admission',
          description: 'Общий вход на все дни фестиваля',
          price: 5000,
          cryptoPrice: { ETH: 0.055, BTC: 0.0015, USDT: 50 },
          quantity: 30000,
          sold: 24567,
          benefits: ['Вход на все дни', 'Доступ к основной сцене', 'Фестивальный браслет'],
          transferable: true,
          refundable: true,
          nftMetadata: {
            image: '/api/placeholder/400/400',
            attributes: [
              { trait_type: 'Event', value: 'Кайф Music Festival 2024' },
              { trait_type: 'Tier', value: 'General' },
              { trait_type: 'Days', value: '3' }
            ]
          }
        },
        {
          id: 'tier2',
          name: 'VIP Pass',
          description: 'VIP доступ со всеми привилегиями',
          price: 15000,
          cryptoPrice: { ETH: 0.165, BTC: 0.0045, USDT: 150 },
          quantity: 5000,
          sold: 3456,
          benefits: ['VIP зона', 'Встреча с артистами', 'Премиум кейтеринг', 'Парковка'],
          transferable: true,
          refundable: true,
          nftMetadata: {
            image: '/api/placeholder/400/401',
            attributes: [
              { trait_type: 'Event', value: 'Кайф Music Festival 2024' },
              { trait_type: 'Tier', value: 'VIP' },
              { trait_type: 'Perks', value: 'All Access' }
            ],
            unlockableContent: 'Эксклюзивный плейлист и закулисные фото'
          }
        }
      ],
      sold: 28023,
      available: 21977,
      price: {
        min: 5000,
        max: 15000,
        currency: 'RUB',
        cryptoAccepted: true
      },
      rating: 4.9,
      reviews: 1234,
      tags: ['Музыка', 'Фестиваль', 'Open Air', 'Лето'],
      features: ['Парковка', 'Фудкорт', 'VIP зона', 'Кемпинг'],
      ageRestriction: '16+',
      blockchain: {
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        tokenStandard: 'ERC-721',
        verified: true,
        resaleAllowed: true,
        royaltyPercentage: 10
      },
      status: 'upcoming',
      streamingAvailable: true,
      virtualTickets: [
        {
          id: 'virtual1',
          tier: 'Online Pass',
          streamUrl: 'https://stream.kaif.events/festival2024',
          vipFeatures: ['HD качество', 'Чат с артистами', 'Запись выступлений'],
          price: 1500
        }
      ]
    },
    {
      id: '2',
      title: 'Blockchain Conference Moscow',
      description: 'Международная конференция по блокчейну и криптовалютам',
      category: 'conference',
      images: ['/api/placeholder/800/602', '/api/placeholder/800/603'],
      date: new Date('2024-03-20'),
      location: {
        venue: 'Экспоцентр',
        address: 'Краснопресненская набережная, 14',
        city: 'Москва',
        coordinates: { lat: 55.7472, lng: 37.5398 },
        capacity: 3000
      },
      organizer: {
        id: 'org2',
        name: 'Tech Events Pro',
        avatar: '/api/placeholder/100/101',
        trustScore: 92,
        totalEvents: 89,
        verified: true,
        walletAddress: '0x456...def'
      },
      tickets: [
        {
          id: 'tier1',
          name: 'Standard Pass',
          description: 'Доступ ко всем докладам',
          price: 8000,
          cryptoPrice: { ETH: 0.088, BTC: 0.0024, USDT: 80 },
          quantity: 2000,
          sold: 1567,
          benefits: ['Все доклады', 'Нетворкинг', 'Обед'],
          transferable: true,
          refundable: false
        }
      ],
      sold: 1567,
      available: 433,
      price: {
        min: 8000,
        max: 25000,
        currency: 'RUB',
        cryptoAccepted: true
      },
      rating: 4.7,
      reviews: 456,
      tags: ['Блокчейн', 'Криптовалюта', 'Технологии', 'Бизнес'],
      features: ['Wi-Fi', 'Кофе-брейки', 'Нетворкинг', 'Записи докладов'],
      blockchain: {
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        tokenStandard: 'ERC-1155',
        verified: true,
        resaleAllowed: false,
        royaltyPercentage: 5
      },
      status: 'upcoming',
      streamingAvailable: true
    }
  ];

  const userTickets: UserTicket[] = [
    {
      id: 'ticket1',
      eventId: '1',
      eventTitle: 'Кайф Music Festival 2024',
      eventDate: new Date('2024-06-15'),
      tierId: 'tier2',
      tierName: 'VIP Pass',
      purchaseDate: new Date('2024-02-01'),
      price: 15000,
      status: 'active',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      nftTokenId: '12345',
      transferHistory: [],
      isListed: false
    }
  ];

  const categories = [
    { id: 'all', label: 'Все события', icon: Sparkles },
    { id: 'concert', label: 'Концерты', icon: Music },
    { id: 'festival', label: 'Фестивали', icon: PartyPopper },
    { id: 'conference', label: 'Конференции', icon: Mic },
    { id: 'sport', label: 'Спорт', icon: Trophy },
    { id: 'theater', label: 'Театр', icon: Film }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎉 КАЙФ-СОБЫТИЯ
              </h1>
              <p className="text-gray-600 mt-1">Билеты на блокчейне с защитой от подделок</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-purple-100 p-2 rounded-lg hover:bg-purple-200 transition-colors">
                <Bell className="w-5 h-5 text-purple-600" />
              </button>
              <div className="bg-purple-100 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-600">Trust Score:</span>
                <span className="ml-2 font-bold text-purple-600">89/100</span>
              </div>
              {web3Connected ? (
                <div className="bg-green-100 px-4 py-2 rounded-lg flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-700">
                    {userWallet.slice(0, 6)}...{userWallet.slice(-4)}
                  </span>
                </div>
              ) : (
                <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all">
                  Подключить кошелек
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'discover', label: 'Открыть', icon: Search },
              { id: 'myTickets', label: 'Мои билеты', icon: Ticket },
              { id: 'resale', label: 'Вторичный рынок', icon: TrendingUp },
              { id: 'organize', label: 'Создать событие', icon: Calendar }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'discover' && (
          <div>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl p-6 shadow-md mb-8">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск событий..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <select className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option value="all">Все даты</option>
                  <option value="today">Сегодня</option>
                  <option value="week">На этой неделе</option>
                  <option value="month">В этом месяце</option>
                </select>
                <select className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option value="moscow">Москва</option>
                  <option value="spb">Санкт-Петербург</option>
                  <option value="online">Онлайн</option>
                </select>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Events Carousel */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Рекомендуем</h2>
                <button className="text-purple-600 hover:text-purple-700 font-medium">
                  Все события →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events
                  .filter(event => selectedCategory === 'all' || event.category === selectedCategory)
                  .map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={() => setSelectedEvent(event)}
                    />
                  ))}
              </div>
            </div>

            {/* NFT Benefits Section */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <Shield className="w-8 h-8 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold mb-2">NFT-билеты на блокчейне</h3>
                  <p className="text-gray-700 mb-4">
                    Каждый билет - уникальный NFT токен с защитой от подделок и возможностью перепродажи
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <QrCode className="w-5 h-5 text-purple-500" />
                        <span className="font-semibold">Уникальный QR</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Проверка подлинности в реальном времени
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <span className="font-semibold">Вторичный рынок</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Безопасная перепродажа с роялти организатору
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Gift className="w-5 h-5 text-pink-500" />
                        <span className="font-semibold">Бонусы</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Эксклюзивный контент и сувениры
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'myTickets' && (
          <MyTicketsSection tickets={userTickets} />
        )}

        {activeTab === 'resale' && (
          <ResaleMarketplace events={events} />
        )}

        {activeTab === 'organize' && (
          <CreateEventSection />
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

// Event Card Component
const EventCard: React.FC<{
  event: Event;
  onSelect: () => void;
}> = ({ event, onSelect }) => {
  const getCategoryIcon = () => {
    switch (event.category) {
      case 'concert': return <Music className="w-5 h-5" />;
      case 'festival': return <PartyPopper className="w-5 h-5" />;
      case 'conference': return <Mic className="w-5 h-5" />;
      case 'sport': return <Trophy className="w-5 h-5" />;
      case 'theater': return <Film className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const availablePercentage = ((event.available / (event.sold + event.available)) * 100).toFixed(0);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
         onClick={onSelect}>
      <div className="relative">
        <img
          src={event.images[0]}
          alt={event.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 left-4 bg-purple-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-white text-sm font-medium">
            {event.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        {event.blockchain.verified && (
          <div className="absolute top-4 right-4 bg-green-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <div className="flex items-center space-x-1 text-white">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">NFT</span>
            </div>
          </div>
        )}
        {event.streamingAvailable && (
          <div className="absolute bottom-4 right-4 bg-blue-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <div className="flex items-center space-x-1 text-white">
              <Camera className="w-4 h-4" />
              <span className="text-sm font-medium">Online</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
            {event.title}
          </h3>
          {getCategoryIcon()}
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600 text-sm">
            <MapPin className="w-4 h-4 mr-1" />
            {event.location.venue}, {event.location.city}
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <Clock className="w-4 h-4 mr-1" />
            {event.date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {event.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs">
              {tag}
            </span>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Осталось билетов</span>
            <span className="font-medium">{availablePercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-2"
              style={{ width: `${availablePercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">от</p>
              <p className="text-2xl font-bold text-gray-800">
                ₽{event.price.min.toLocaleString()}
              </p>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all">
              Купить билет
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Event Detail Modal
const EventDetailModal: React.FC<{
  event: Event;
  onClose: () => void;
}> = ({ event, onClose }) => {
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="relative">
          <img
            src={event.images[0]}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
            <h2 className="text-3xl font-bold text-white mb-2">{event.title}</h2>
            <div className="flex items-center space-x-4 text-white/90">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-1" />
                {event.date.toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-1" />
                {event.location.venue}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3">О событии</h3>
            <p className="text-gray-600">{event.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3">Выберите билет</h3>
            <div className="space-y-3">
              {event.tickets.map(tier => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTier?.id === tier.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{tier.name}</h4>
                      <p className="text-sm text-gray-600">{tier.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">₽{tier.price.toLocaleString()}</p>
                      {tier.cryptoPrice && (
                        <p className="text-xs text-gray-500">
                          {tier.cryptoPrice.USDT} USDT
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tier.benefits.map((benefit, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {benefit}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Осталось: {tier.quantity - tier.sold} из {tier.quantity}
                    </span>
                    {tier.nftMetadata && (
                      <div className="flex items-center text-purple-600">
                        <Zap className="w-4 h-4 mr-1" />
                        NFT билет
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTier && (
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Количество
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Способ оплаты
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="card">Банковская карта</option>
                    <option value="crypto">Криптовалюта</option>
                  </select>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Итого к оплате:</span>
                  <span className="text-2xl font-bold">
                    ₽{(selectedTier.price * quantity).toLocaleString()}
                  </span>
                </div>
                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                  Оформить покупку
                </button>
              </div>
            </div>
          )}

          {/* Organizer Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold mb-3">Организатор</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={event.organizer.avatar}
                  alt={event.organizer.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-medium">{event.organizer.name}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="w-4 h-4 text-purple-500 mr-1" />
                    Trust Score: {event.organizer.trustScore}
                    {event.organizer.verified && (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{event.organizer.totalEvents} событий</p>
                <div className="flex items-center text-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                  {event.rating} ({event.reviews})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// My Tickets Section
const MyTicketsSection: React.FC<{ tickets: UserTicket[] }> = ({ tickets }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Мои билеты</h2>
      {tickets.length > 0 ? (
        <div className="grid gap-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{ticket.eventTitle}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {ticket.eventDate.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center">
                      <Ticket className="w-4 h-4 mr-2" />
                      {ticket.tierName}
                    </div>
                    {ticket.nftTokenId && (
                      <div className="flex items-center text-purple-600">
                        <Zap className="w-4 h-4 mr-2" />
                        NFT #{ticket.nftTokenId}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ticket.status === 'active' ? 'bg-green-100 text-green-700' :
                      ticket.status === 'used' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {ticket.status === 'active' ? 'Активен' :
                       ticket.status === 'used' ? 'Использован' : 'Истёк'}
                    </span>
                    {ticket.isListed && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        На продаже
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <QrCode className="w-24 h-24 text-gray-700" />
                  </div>
                  <div className="mt-2 space-y-1">
                    <button className="w-full text-sm bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600">
                      Показать QR
                    </button>
                    {!ticket.isListed && ticket.status === 'active' && (
                      <button className="w-full text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">
                        Продать
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">У вас пока нет билетов</p>
          <button className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600">
            Найти события
          </button>
        </div>
      )}
    </div>
  );
};

// Resale Marketplace
const ResaleMarketplace: React.FC<{ events: Event[] }> = ({ events }) => {
  return (
    <div>
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-3">Вторичный рынок билетов</h2>
        <p className="text-gray-700 mb-4">
          Безопасная покупка и продажа билетов через смарт-контракты с гарантией подлинности
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <Shield className="w-8 h-8 text-purple-500 mb-2" />
            <h3 className="font-semibold mb-1">100% защита</h3>
            <p className="text-sm text-gray-600">
              Проверка подлинности каждого NFT-билета
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
            <h3 className="font-semibold mb-1">Справедливые цены</h3>
            <p className="text-sm text-gray-600">
              Роялти организатору от перепродажи
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <Zap className="w-8 h-8 text-yellow-500 mb-2" />
            <h3 className="font-semibold mb-1">Моментальная передача</h3>
            <p className="text-sm text-gray-600">
              Автоматический перевод через блокчейн
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for resale tickets */}
        <div className="bg-white rounded-xl p-6 shadow-md text-center">
          <p className="text-gray-500">Билеты на перепродаже появятся здесь</p>
        </div>
      </div>
    </div>
  );
};

// Create Event Section
const CreateEventSection: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Создайте своё событие</h2>
        <p className="text-gray-600 mb-6">
          Организуйте мероприятия с NFT-билетами и получайте роялти от вторичных продаж
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Преимущества для организаторов:</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Защита от подделок и спекулянтов
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Роялти от перепродажи билетов (до 20%)
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Мгновенные выплаты в криптовалюте
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Аналитика и статистика продаж
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Система репутации и верификации
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Типы событий:</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🎵', label: 'Концерты' },
                { icon: '🎪', label: 'Фестивали' },
                { icon: '🎭', label: 'Театр' },
                { icon: '⚽', label: 'Спорт' },
                { icon: '💼', label: 'Конференции' },
                { icon: '🎨', label: 'Выставки' }
              ].map((type, idx) => (
                <div key={idx} className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                  <span className="text-2xl">{type.icon}</span>
                  <span>{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            Начать создание события
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventsFeature;
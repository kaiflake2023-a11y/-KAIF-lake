// КАЙФ-АРЕНДА: Rental & Sharing Economy Module
// Complete implementation with blockchain smart contracts and reputation system

import React, { useState, useEffect } from 'react';
import { Home, Car, Camera, Laptop, Bike, Package, Shield, Star, Clock, MapPin, Calendar, DollarSign, CheckCircle, AlertCircle, TrendingUp, Users, Lock, Key, Wifi, Tv, Wind, Coffee, ParkingCircle, Dumbbell } from 'lucide-react';

// Types and Interfaces
interface RentalItem {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  ownerTrustScore: number;
  category: 'property' | 'vehicle' | 'equipment' | 'electronics' | 'sports' | 'tools';
  subcategory: string;
  title: string;
  description: string;
  images: string[];
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
    district: string;
    city: string;
  };
  price: {
    hourly?: number;
    daily: number;
    weekly?: number;
    monthly?: number;
    deposit: number;
    cryptoPrice?: {
      ETH: number;
      BTC: number;
      USDT: number;
    };
  };
  availability: {
    from: Date;
    to: Date;
    bookedDates: Date[];
    instantBooking: boolean;
  };
  features: string[];
  rules: string[];
  rating: number;
  reviews: number;
  totalRentals: number;
  responseTime: string;
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  insuranceIncluded: boolean;
  smartContract: {
    address: string;
    tokenId: string;
    depositLocked: boolean;
    verified: boolean;
  };
  verification: {
    identity: boolean;
    ownership: boolean;
    insurance: boolean;
  };
}

interface PropertyDetails extends RentalItem {
  propertyType: 'apartment' | 'house' | 'room' | 'studio' | 'villa';
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: number;
  amenities: {
    wifi: boolean;
    parking: boolean;
    kitchen: boolean;
    washer: boolean;
    airConditioning: boolean;
    heating: boolean;
    tv: boolean;
    workspace: boolean;
    gym: boolean;
    pool: boolean;
  };
  maxGuests: number;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  eventsAllowed: boolean;
}

interface VehicleDetails extends RentalItem {
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'boat';
  brand: string;
  model: string;
  year: number;
  transmission: 'manual' | 'automatic' | 'electric';
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  seats?: number;
  mileageIncluded: number;
  extraMileageCost: number;
  minimumAge: number;
  licenseRequired: string;
}

interface RentalContract {
  id: string;
  itemId: string;
  renterId: string;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  depositAmount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  paymentMethod: 'crypto' | 'card';
  transactionHash?: string;
  smartContractStatus: {
    depositLocked: boolean;
    depositReleased: boolean;
    disputeOpen: boolean;
  };
  reviews: {
    fromRenter?: RentalReview;
    fromOwner?: RentalReview;
  };
}

interface RentalReview {
  rating: number;
  comment: string;
  date: Date;
  verified: boolean;
  aspects: {
    condition: number;
    communication: number;
    location: number;
    value: number;
  };
}

interface DisputeCase {
  id: string;
  contractId: string;
  initiatorId: string;
  reason: string;
  evidence: string[];
  status: 'open' | 'investigating' | 'resolved';
  resolution?: {
    decision: string;
    refundAmount: number;
    penaltyAmount: number;
  };
  mediatorId?: string;
  createdAt: Date;
}

// Smart Contract ABI for Rental Platform
const RENTAL_CONTRACT_ABI = [
  {
    "inputs": [
      { "name": "itemId", "type": "uint256" },
      { "name": "startDate", "type": "uint256" },
      { "name": "endDate", "type": "uint256" },
      { "name": "depositAmount", "type": "uint256" }
    ],
    "name": "createRental",
    "outputs": [{ "name": "contractId", "type": "uint256" }],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "contractId", "type": "uint256" }
    ],
    "name": "confirmRental",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "contractId", "type": "uint256" }
    ],
    "name": "completeRental",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "contractId", "type": "uint256" }
    ],
    "name": "releaseDeposit",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "contractId", "type": "uint256" },
      { "name": "reason", "type": "string" }
    ],
    "name": "openDispute",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "userAddress", "type": "address" }
    ],
    "name": "getUserTrustScore",
    "outputs": [{ "name": "score", "type": "uint256" }],
    "type": "function"
  }
];

// Main Rental Component
export const RentalFeature: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'browse' | 'myRentals' | 'myListings' | 'list'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchLocation, setSearchLocation] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);
  const [web3Connected, setWeb3Connected] = useState(false);
  const [userWallet, setUserWallet] = useState<string>('');
  const [userTrustScore, setUserTrustScore] = useState(85);

  // Mock data for rental items
  const rentalItems: RentalItem[] = [
    {
      id: '1',
      ownerId: 'owner1',
      ownerName: 'Александр Смирнов',
      ownerAvatar: '/api/placeholder/100/100',
      ownerTrustScore: 92,
      category: 'property',
      subcategory: 'apartment',
      title: 'Уютная студия в центре Москвы',
      description: 'Современная студия с панорамным видом на город, полностью оборудованная',
      images: ['/api/placeholder/800/600', '/api/placeholder/800/601'],
      location: {
        address: 'ул. Тверская, 12',
        coordinates: { lat: 55.7558, lng: 37.6173 },
        district: 'Тверской',
        city: 'Москва'
      },
      price: {
        daily: 3500,
        weekly: 20000,
        monthly: 65000,
        deposit: 10000,
        cryptoPrice: {
          ETH: 0.04,
          BTC: 0.001,
          USDT: 35
        }
      },
      availability: {
        from: new Date('2024-02-01'),
        to: new Date('2024-12-31'),
        bookedDates: [],
        instantBooking: true
      },
      features: ['Wi-Fi', 'Кухня', 'Стиральная машина', 'Кондиционер', 'Рабочее место'],
      rules: ['Не курить', 'Без животных', 'Без вечеринок'],
      rating: 4.8,
      reviews: 47,
      totalRentals: 89,
      responseTime: '< 1 час',
      cancellationPolicy: 'flexible',
      insuranceIncluded: true,
      smartContract: {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        tokenId: 'RENTAL-001',
        depositLocked: false,
        verified: true
      },
      verification: {
        identity: true,
        ownership: true,
        insurance: true
      }
    },
    {
      id: '2',
      ownerId: 'owner2',
      ownerName: 'Мария Петрова',
      ownerAvatar: '/api/placeholder/100/101',
      ownerTrustScore: 88,
      category: 'vehicle',
      subcategory: 'car',
      title: 'Tesla Model 3 2023',
      description: 'Электромобиль премиум-класса с автопилотом',
      images: ['/api/placeholder/800/602', '/api/placeholder/800/603'],
      location: {
        address: 'Ленинградский проспект, 45',
        coordinates: { lat: 55.7858, lng: 37.5673 },
        district: 'Беговой',
        city: 'Москва'
      },
      price: {
        hourly: 1500,
        daily: 8000,
        weekly: 45000,
        deposit: 20000,
        cryptoPrice: {
          ETH: 0.09,
          BTC: 0.002,
          USDT: 80
        }
      },
      availability: {
        from: new Date('2024-02-01'),
        to: new Date('2024-12-31'),
        bookedDates: [],
        instantBooking: false
      },
      features: ['Автопилот', 'Панорамная крыша', 'Премиум аудио', 'Быстрая зарядка'],
      rules: ['Водительский стаж от 3 лет', 'Возраст от 23 лет', 'Залог обязателен'],
      rating: 4.9,
      reviews: 34,
      totalRentals: 67,
      responseTime: '< 30 минут',
      cancellationPolicy: 'moderate',
      insuranceIncluded: true,
      smartContract: {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        tokenId: 'RENTAL-002',
        depositLocked: false,
        verified: true
      },
      verification: {
        identity: true,
        ownership: true,
        insurance: true
      }
    },
    {
      id: '3',
      ownerId: 'owner3',
      ownerName: 'Дмитрий Козлов',
      ownerAvatar: '/api/placeholder/100/102',
      ownerTrustScore: 90,
      category: 'equipment',
      subcategory: 'camera',
      title: 'Canon EOS R5 + Объективы',
      description: 'Профессиональная камера с набором объективов для любых задач',
      images: ['/api/placeholder/800/604', '/api/placeholder/800/605'],
      location: {
        address: 'Кутузовский проспект, 32',
        coordinates: { lat: 55.7458, lng: 37.5373 },
        district: 'Дорогомилово',
        city: 'Москва'
      },
      price: {
        hourly: 500,
        daily: 3000,
        weekly: 15000,
        deposit: 50000,
        cryptoPrice: {
          ETH: 0.03,
          BTC: 0.0008,
          USDT: 30
        }
      },
      availability: {
        from: new Date('2024-02-01'),
        to: new Date('2024-12-31'),
        bookedDates: [],
        instantBooking: true
      },
      features: ['45MP матрица', '8K видео', 'Стабилизация', '3 объектива в комплекте'],
      rules: ['Опыт работы с проф. техникой', 'Паспорт обязателен', 'Страховка включена'],
      rating: 5.0,
      reviews: 28,
      totalRentals: 45,
      responseTime: '< 2 часа',
      cancellationPolicy: 'strict',
      insuranceIncluded: true,
      smartContract: {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        tokenId: 'RENTAL-003',
        depositLocked: false,
        verified: true
      },
      verification: {
        identity: true,
        ownership: true,
        insurance: true
      }
    }
  ];

  const categories = [
    { id: 'all', label: 'Все категории', icon: Package },
    { id: 'property', label: 'Недвижимость', icon: Home },
    { id: 'vehicle', label: 'Транспорт', icon: Car },
    { id: 'equipment', label: 'Оборудование', icon: Camera },
    { id: 'electronics', label: 'Электроника', icon: Laptop },
    { id: 'sports', label: 'Спорт', icon: Bike }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                🏠 КАЙФ-АРЕНДА
              </h1>
              <p className="text-gray-600 mt-1">Безопасная аренда с блокчейн-гарантиями</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-600">Trust Score:</span>
                <span className="ml-2 font-bold text-indigo-600">{userTrustScore}/100</span>
              </div>
              {web3Connected ? (
                <div className="bg-green-100 px-4 py-2 rounded-lg flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-700">
                    {userWallet.slice(0, 6)}...{userWallet.slice(-4)}
                  </span>
                </div>
              ) : (
                <button className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all">
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
              { id: 'browse', label: 'Найти аренду' },
              { id: 'myRentals', label: 'Мои аренды' },
              { id: 'myListings', label: 'Мои объявления' },
              { id: 'list', label: 'Сдать в аренду' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 border-b-2 transition-colors font-medium ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'browse' && (
          <div>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl p-6 shadow-md mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Город, район или адрес"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <button className="w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition-colors">
                    Поиск
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Популярные предложения</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rentalItems
                  .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
                  .map(item => (
                    <RentalCard
                      key={item.id}
                      item={item}
                      onSelect={() => setSelectedItem(item)}
                    />
                  ))}
              </div>
            </div>

            {/* Trust Score Info */}
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <Shield className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold mb-2">Безопасная аренда с блокчейном</h3>
                  <p className="text-gray-700 mb-3">
                    Все сделки защищены смарт-контрактами. Депозит блокируется до завершения аренды.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Lock className="w-5 h-5 text-green-500" />
                        <span className="font-semibold">Защищенный депозит</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Средства блокируются в смарт-контракте
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold">Проверенные владельцы</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Верификация личности и права собственности
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span className="font-semibold">Система репутации</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Trust Score на основе истории сделок
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'myRentals' && (
          <MyRentalsSection />
        )}

        {activeTab === 'myListings' && (
          <MyListingsSection />
        )}

        {activeTab === 'list' && (
          <ListItemSection />
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <RentalDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

// Rental Card Component
const RentalCard: React.FC<{
  item: RentalItem;
  onSelect: () => void;
}> = ({ item, onSelect }) => {
  const getCategoryIcon = () => {
    switch (item.category) {
      case 'property': return <Home className="w-5 h-5" />;
      case 'vehicle': return <Car className="w-5 h-5" />;
      case 'equipment': return <Camera className="w-5 h-5" />;
      case 'electronics': return <Laptop className="w-5 h-5" />;
      case 'sports': return <Bike className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
         onClick={onSelect}>
      <div className="relative">
        <img
          src={item.images[0]}
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="font-semibold">{item.rating}</span>
            <span className="text-gray-500 text-sm">({item.reviews})</span>
          </div>
        </div>
        {item.verification.identity && item.verification.ownership && (
          <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <div className="flex items-center space-x-1 text-white">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Verified</span>
            </div>
          </div>
        )}
        {item.availability.instantBooking && (
          <div className="absolute bottom-4 left-4 bg-blue-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-white text-sm font-medium">Мгновенное бронирование</span>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
            {item.title}
          </h3>
          {getCategoryIcon()}
        </div>
        
        <div className="flex items-center text-gray-600 text-sm mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          {item.location.district}, {item.location.city}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {item.features.slice(0, 3).map((feature, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
              {feature}
            </span>
          ))}
          {item.features.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
              +{item.features.length - 3}
            </span>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-2xl font-bold text-gray-800">
                ₽{item.price.daily?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">за день</p>
            </div>
            {item.price.cryptoPrice && (
              <div className="text-right">
                <p className="text-sm font-medium text-indigo-600">
                  {item.price.cryptoPrice.USDT} USDT
                </p>
                <p className="text-xs text-gray-500">или крипто</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src={item.ownerAvatar}
                alt={item.ownerName}
                className="w-6 h-6 rounded-full"
              />
              <div>
                <p className="text-xs font-medium">{item.ownerName}</p>
                <div className="flex items-center">
                  <Shield className="w-3 h-3 text-indigo-500 mr-1" />
                  <span className="text-xs text-gray-500">Trust: {item.ownerTrustScore}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{item.responseTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rental Detail Modal
const RentalDetailModal: React.FC<{
  item: RentalItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const [selectedTab, setSelectedTab] = useState<'details' | 'reviews' | 'owner' | 'book'>('details');
  const [bookingDates, setBookingDates] = useState({ start: '', end: '' });
  const [paymentMethod, setPaymentMethod] = useState('card');

  const calculateTotalPrice = () => {
    if (!bookingDates.start || !bookingDates.end) return 0;
    const start = new Date(bookingDates.start);
    const end = new Date(bookingDates.end);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days * (item.price.daily || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-1 h-64">
            {item.images.slice(0, 3).map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${item.title} ${idx + 1}`}
                className={`w-full h-full object-cover ${idx === 0 ? 'col-span-2' : ''}`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Item Info */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-1" />
                  {item.location.address}
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-current mr-1" />
                  {item.rating} ({item.reviews} отзывов)
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">₽{item.price.daily?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">за день</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-6 px-6">
            {[
              { id: 'details', label: 'Описание' },
              { id: 'reviews', label: 'Отзывы' },
              { id: 'owner', label: 'Владелец' },
              { id: 'book', label: 'Бронирование' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-3 border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 font-semibold'
                    : 'border-transparent text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {selectedTab === 'details' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3">Описание</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3">Удобства и особенности</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {item.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3">Правила аренды</h3>
                <ul className="space-y-2">
                  {item.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">Защита сделки</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Депозит в размере ₽{item.price.deposit.toLocaleString()} будет заблокирован в смарт-контракте до завершения аренды
                </p>
              </div>
            </div>
          )}

          {selectedTab === 'owner' && (
            <div>
              <div className="flex items-start space-x-4 mb-6">
                <img
                  src={item.ownerAvatar}
                  alt={item.ownerName}
                  className="w-20 h-20 rounded-full"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{item.ownerName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 text-indigo-500 mr-1" />
                      Trust Score: {item.ownerTrustScore}
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      Верифицирован
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{item.totalRentals}</p>
                      <p className="text-xs text-gray-500">Сделок</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{item.rating}</p>
                      <p className="text-xs text-gray-500">Рейтинг</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{item.responseTime}</p>
                      <p className="text-xs text-gray-500">Ответ</p>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition-colors">
                Написать владельцу
              </button>
            </div>
          )}

          {selectedTab === 'book' && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={bookingDates.start}
                    onChange={(e) => setBookingDates({ ...bookingDates, start: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={bookingDates.end}
                    onChange={(e) => setBookingDates({ ...bookingDates, end: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-3">Способ оплаты</h4>
                <div className="space-y-2">
                  {[
                    { id: 'card', label: 'Банковская карта', icon: '💳' },
                    { id: 'crypto', label: 'Криптовалюта', icon: '₿' }
                  ].map(method => (
                    <label key={method.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <span className="mr-2">{method.icon}</span>
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {bookingDates.start && bookingDates.end && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold mb-3">Детали бронирования</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Стоимость аренды</span>
                      <span className="font-medium">₽{calculateTotalPrice().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Депозит</span>
                      <span className="font-medium">₽{item.price.deposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Комиссия платформы</span>
                      <span className="font-medium">₽{Math.round(calculateTotalPrice() * 0.05).toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Итого</span>
                      <span className="font-bold text-lg">
                        ₽{(calculateTotalPrice() + item.price.deposit + Math.round(calculateTotalPrice() * 0.05)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                disabled={!bookingDates.start || !bookingDates.end}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {item.availability.instantBooking ? 'Забронировать' : 'Отправить запрос'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// My Rentals Section
const MyRentalsSection: React.FC = () => {
  const activeRentals = [
    {
      id: '1',
      title: 'Tesla Model 3',
      status: 'active',
      startDate: '2024-02-10',
      endDate: '2024-02-15',
      totalPrice: 40000,
      image: '/api/placeholder/200/150'
    }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Мои текущие аренды</h2>
      {activeRentals.length > 0 ? (
        <div className="grid gap-4">
          {activeRentals.map(rental => (
            <div key={rental.id} className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={rental.image}
                    alt={rental.title}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-lg">{rental.title}</h3>
                    <p className="text-gray-600">
                      {rental.startDate} - {rental.endDate}
                    </p>
                    <div className="flex items-center mt-2">
                      <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        Активна
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">₽{rental.totalPrice.toLocaleString()}</p>
                  <button className="mt-2 text-indigo-600 hover:text-indigo-700">
                    Подробнее →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-4">У вас пока нет активных аренд</p>
          <button className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600">
            Найти аренду
          </button>
        </div>
      )}
    </div>
  );
};

// My Listings Section
const MyListingsSection: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Мои объявления</h2>
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <p className="text-gray-500 mb-4">У вас пока нет объявлений</p>
        <button className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600">
          Создать объявление
        </button>
      </div>
    </div>
  );
};

// List Item Section
const ListItemSection: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Сдайте в аренду и зарабатывайте</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Что можно сдавать:</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🏠', label: 'Недвижимость' },
                { icon: '🚗', label: 'Транспорт' },
                { icon: '📸', label: 'Оборудование' },
                { icon: '💻', label: 'Электроника' },
                { icon: '🚴', label: 'Спорт инвентарь' },
                { icon: '🔧', label: 'Инструменты' }
              ].map((cat, idx) => (
                <div key={idx} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Преимущества платформы:</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Защита сделок смарт-контрактами
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Страхование имущества
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Проверка арендаторов
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Оплата в криптовалюте
              </li>
            </ul>
          </div>

          <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            Создать объявление
          </button>
        </div>
      </div>
    </div>
  );
};

export default RentalFeature;
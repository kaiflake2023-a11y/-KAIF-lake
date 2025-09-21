// КАЙФ-ПУТЕШЕСТВИЯ: Travel & Tourism Module
// Complete implementation with blockchain integration and reputation system

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Star, Shield, DollarSign, Clock, Camera, Heart, MessageCircle, Share2, Plane, Hotel, Car, Train, Ship, Mountain, Beach, Building, Trees } from 'lucide-react';

// Types and Interfaces
interface TravelPackage {
  id: string;
  title: string;
  destination: string;
  description: string;
  duration: string;
  price: number;
  cryptoPrice: {
    ETH: number;
    BTC: number;
    USDT: number;
  };
  images: string[];
  rating: number;
  reviews: number;
  guideTrustScore: number;
  includedServices: string[];
  excludedServices: string[];
  maxGroupSize: number;
  currentBookings: number;
  departureDate: Date;
  returnDate: Date;
  difficulty: 'easy' | 'moderate' | 'hard';
  type: 'adventure' | 'relaxation' | 'cultural' | 'business' | 'eco';
  blockchain: {
    contractAddress: string;
    tokenId: string;
    verified: boolean;
  };
  guide: TravelGuide;
  itinerary: Itinerary[];
  accommodations: Accommodation[];
  transportation: Transportation[];
}

interface TravelGuide {
  id: string;
  name: string;
  avatar: string;
  languages: string[];
  experience: string;
  trustScore: number;
  totalTrips: number;
  specializations: string[];
  certifications: string[];
  responseTime: string;
  walletAddress: string;
}

interface Itinerary {
  day: number;
  title: string;
  activities: Activity[];
  meals: string[];
  accommodation: string;
}

interface Activity {
  time: string;
  name: string;
  description: string;
  duration: string;
  location: string;
  included: boolean;
  optionalCost?: number;
}

interface Accommodation {
  name: string;
  type: 'hotel' | 'hostel' | 'apartment' | 'camping' | 'resort';
  rating: number;
  amenities: string[];
  location: string;
  checkIn: string;
  checkOut: string;
}

interface Transportation {
  type: 'flight' | 'train' | 'bus' | 'car' | 'boat';
  from: string;
  to: string;
  departure: Date;
  arrival: Date;
  class: string;
  operator: string;
}

interface TravelReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTrustScore: number;
  rating: number;
  title: string;
  content: string;
  photos: string[];
  date: Date;
  helpful: number;
  verified: boolean;
}

interface LocalExperience {
  id: string;
  hostId: string;
  hostName: string;
  hostTrustScore: number;
  title: string;
  description: string;
  location: string;
  duration: string;
  price: number;
  maxGuests: number;
  languages: string[];
  includes: string[];
  rating: number;
  availability: Date[];
  category: 'culinary' | 'adventure' | 'cultural' | 'wellness' | 'workshop';
}

// Smart Contract ABI for Travel Bookings
const TRAVEL_CONTRACT_ABI = [
  {
    "inputs": [
      { "name": "packageId", "type": "uint256" },
      { "name": "participants", "type": "uint256" },
      { "name": "paymentToken", "type": "address" }
    ],
    "name": "bookPackage",
    "outputs": [{ "name": "bookingId", "type": "uint256" }],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "bookingId", "type": "uint256" }
    ],
    "name": "confirmBooking",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "bookingId", "type": "uint256" },
      { "name": "reason", "type": "string" }
    ],
    "name": "cancelBooking",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "bookingId", "type": "uint256" },
      { "name": "rating", "type": "uint8" },
      { "name": "review", "type": "string" }
    ],
    "name": "leaveReview",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [
      { "name": "guideAddress", "type": "address" }
    ],
    "name": "getGuideTrustScore",
    "outputs": [{ "name": "score", "type": "uint256" }],
    "type": "function"
  }
];

// Main Travel Component
export const TravelFeature: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'booked' | 'local' | 'guide'>('explore');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);
  const [web3Connected, setWeb3Connected] = useState(false);
  const [userWallet, setUserWallet] = useState<string>('');

  // Mock data for travel packages
  const travelPackages: TravelPackage[] = [
    {
      id: '1',
      title: 'Северное Сияние в Мурманске',
      destination: 'Мурманск, Россия',
      description: 'Незабываемое путешествие за полярный круг с наблюдением северного сияния',
      duration: '5 дней / 4 ночи',
      price: 45000,
      cryptoPrice: { ETH: 0.5, BTC: 0.015, USDT: 450 },
      images: ['/api/placeholder/800/600', '/api/placeholder/800/601'],
      rating: 4.9,
      reviews: 127,
      guideTrustScore: 95,
      includedServices: ['Транспорт', 'Проживание', 'Питание', 'Экскурсии', 'Страховка'],
      excludedServices: ['Алкоголь', 'Личные расходы', 'Сувениры'],
      maxGroupSize: 12,
      currentBookings: 8,
      departureDate: new Date('2024-02-15'),
      returnDate: new Date('2024-02-20'),
      difficulty: 'moderate',
      type: 'adventure',
      blockchain: {
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        tokenId: 'TRAVEL-001',
        verified: true
      },
      guide: {
        id: 'guide1',
        name: 'Александр Петров',
        avatar: '/api/placeholder/100/100',
        languages: ['Русский', 'English', 'Deutsch'],
        experience: '8 лет',
        trustScore: 95,
        totalTrips: 234,
        specializations: ['Арктика', 'Фототуры', 'Экстрим'],
        certifications: ['International Mountain Leader', 'Wilderness First Aid'],
        responseTime: '< 1 час',
        walletAddress: '0x123...abc'
      },
      itinerary: [
        {
          day: 1,
          title: 'Прибытие в Мурманск',
          activities: [
            {
              time: '10:00',
              name: 'Встреча в аэропорту',
              description: 'Трансфер в отель',
              duration: '1 час',
              location: 'Аэропорт Мурманск',
              included: true
            }
          ],
          meals: ['Обед', 'Ужин'],
          accommodation: 'Park Inn by Radisson'
        }
      ],
      accommodations: [
        {
          name: 'Park Inn by Radisson',
          type: 'hotel',
          rating: 4,
          amenities: ['Wi-Fi', 'Завтрак', 'Спа', 'Ресторан'],
          location: 'Центр Мурманска',
          checkIn: '14:00',
          checkOut: '12:00'
        }
      ],
      transportation: [
        {
          type: 'flight',
          from: 'Москва',
          to: 'Мурманск',
          departure: new Date('2024-02-15T08:00'),
          arrival: new Date('2024-02-15T11:00'),
          class: 'Эконом',
          operator: 'Аэрофлот'
        }
      ]
    },
    {
      id: '2',
      title: 'Золотое Кольцо России',
      destination: 'Владимир, Суздаль, Сергиев Посад',
      description: 'Путешествие по древним городам России с богатой историей и архитектурой',
      duration: '7 дней / 6 ночей',
      price: 38000,
      cryptoPrice: { ETH: 0.42, BTC: 0.012, USDT: 380 },
      images: ['/api/placeholder/800/602', '/api/placeholder/800/603'],
      rating: 4.8,
      reviews: 89,
      guideTrustScore: 92,
      includedServices: ['Транспорт', 'Проживание', 'Завтраки', 'Экскурсии', 'Входные билеты'],
      excludedServices: ['Обеды и ужины', 'Личные расходы'],
      maxGroupSize: 20,
      currentBookings: 14,
      departureDate: new Date('2024-03-01'),
      returnDate: new Date('2024-03-08'),
      difficulty: 'easy',
      type: 'cultural',
      blockchain: {
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        tokenId: 'TRAVEL-002',
        verified: true
      },
      guide: {
        id: 'guide2',
        name: 'Елена Иванова',
        avatar: '/api/placeholder/100/101',
        languages: ['Русский', 'English', 'Français'],
        experience: '12 лет',
        trustScore: 92,
        totalTrips: 456,
        specializations: ['История', 'Архитектура', 'Культура'],
        certifications: ['Гид-экскурсовод высшей категории'],
        responseTime: '< 2 часа',
        walletAddress: '0x456...def'
      },
      itinerary: [],
      accommodations: [],
      transportation: []
    }
  ];

  const localExperiences: LocalExperience[] = [
    {
      id: 'exp1',
      hostId: 'host1',
      hostName: 'Мария Волкова',
      hostTrustScore: 88,
      title: 'Мастер-класс по приготовлению борща',
      description: 'Научитесь готовить традиционный русский борщ от местного шеф-повара',
      location: 'Москва',
      duration: '3 часа',
      price: 2500,
      maxGuests: 8,
      languages: ['Русский', 'English'],
      includes: ['Все ингредиенты', 'Фартук', 'Рецепты', 'Обед'],
      rating: 4.9,
      availability: [new Date('2024-02-20'), new Date('2024-02-22')],
      category: 'culinary'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🌍 КАЙФ-ПУТЕШЕСТВИЯ
              </h1>
              <p className="text-gray-600 mt-1">Откройте мир с доверенными гидами</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-600">Ваш Trust Score:</span>
                <span className="ml-2 font-bold text-blue-600">87/100</span>
              </div>
              {web3Connected ? (
                <div className="bg-green-100 px-4 py-2 rounded-lg flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-700">
                    {userWallet.slice(0, 6)}...{userWallet.slice(-4)}
                  </span>
                </div>
              ) : (
                <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all">
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
              { id: 'explore', label: 'Исследовать', icon: MapPin },
              { id: 'booked', label: 'Мои поездки', icon: Calendar },
              { id: 'local', label: 'Местный опыт', icon: Users },
              { id: 'guide', label: 'Стать гидом', icon: Shield }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
        {activeTab === 'explore' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-xl p-6 shadow-md mb-8">
              <h3 className="text-lg font-semibold mb-4">Фильтры поиска</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Направление
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="all">Все направления</option>
                    <option value="russia">Россия</option>
                    <option value="europe">Европа</option>
                    <option value="asia">Азия</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип путешествия
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="all">Все типы</option>
                    <option value="adventure">Приключения</option>
                    <option value="relaxation">Отдых</option>
                    <option value="cultural">Культурный</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Бюджет (₽)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="От"
                      className="w-24 px-3 py-2 border rounded-lg"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="До"
                      className="w-24 px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Даты
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Travel Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {travelPackages.map(pkg => (
                <TravelPackageCard
                  key={pkg.id}
                  package={pkg}
                  onSelect={() => setSelectedPackage(pkg)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'local' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Местные впечатления</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localExperiences.map(exp => (
                <LocalExperienceCard key={exp.id} experience={exp} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <GuideRegistration />
        )}
      </div>

      {/* Package Detail Modal */}
      {selectedPackage && (
        <PackageDetailModal
          package={selectedPackage}
          onClose={() => setSelectedPackage(null)}
        />
      )}
    </div>
  );
};

// Travel Package Card Component
const TravelPackageCard: React.FC<{
  package: TravelPackage;
  onSelect: () => void;
}> = ({ package: pkg, onSelect }) => {
  const getTypeIcon = () => {
    switch (pkg.type) {
      case 'adventure': return <Mountain className="w-5 h-5" />;
      case 'relaxation': return <Beach className="w-5 h-5" />;
      case 'cultural': return <Building className="w-5 h-5" />;
      case 'eco': return <Trees className="w-5 h-5" />;
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
         onClick={onSelect}>
      <div className="relative">
        <img
          src={pkg.images[0]}
          alt={pkg.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="font-semibold">{pkg.rating}</span>
            <span className="text-gray-500 text-sm">({pkg.reviews})</span>
          </div>
        </div>
        {pkg.blockchain.verified && (
          <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <div className="flex items-center space-x-1 text-white">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Verified</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
            {pkg.title}
          </h3>
          {getTypeIcon()}
        </div>
        
        <div className="flex items-center text-gray-600 text-sm mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          {pkg.destination}
        </div>
        
        <div className="flex items-center text-gray-600 text-sm mb-4">
          <Clock className="w-4 h-4 mr-1" />
          {pkg.duration}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-gray-800">
              ₽{pkg.price.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">
              или {pkg.cryptoPrice.ETH} ETH
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {pkg.currentBookings}/{pkg.maxGroupSize} мест
            </p>
            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-500 rounded-full h-2"
                style={{ width: `${(pkg.currentBookings / pkg.maxGroupSize) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src={pkg.guide.avatar}
                alt={pkg.guide.name}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <p className="text-sm font-medium">{pkg.guide.name}</p>
                <div className="flex items-center">
                  <Shield className="w-3 h-3 text-blue-500 mr-1" />
                  <span className="text-xs text-gray-500">
                    Trust: {pkg.guide.trustScore}
                  </span>
                </div>
              </div>
            </div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Подробнее
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Local Experience Card Component
const LocalExperienceCard: React.FC<{
  experience: LocalExperience;
}> = ({ experience: exp }) => {
  const getCategoryIcon = () => {
    switch (exp.category) {
      case 'culinary': return '👨‍🍳';
      case 'adventure': return '🏔️';
      case 'cultural': return '🎭';
      case 'wellness': return '🧘';
      case 'workshop': return '🎨';
      default: return '✨';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{getCategoryIcon()}</div>
        <div className="flex items-center space-x-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="font-semibold">{exp.rating}</span>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-2">{exp.title}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{exp.description}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          {exp.location}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          {exp.duration}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          До {exp.maxGuests} человек
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xl font-bold">₽{exp.price}</p>
            <p className="text-xs text-gray-500">за человека</p>
          </div>
          <div className="flex items-center">
            <Shield className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-sm text-gray-600">Trust: {exp.hostTrustScore}</span>
          </div>
        </div>
        <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 rounded-lg hover:shadow-lg transition-all">
          Забронировать
        </button>
      </div>
    </div>
  );
};

// Package Detail Modal Component
const PackageDetailModal: React.FC<{
  package: TravelPackage;
  onClose: () => void;
}> = ({ package: pkg, onClose }) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'itinerary' | 'reviews' | 'booking'>('overview');
  const [bookingData, setBookingData] = useState({
    participants: 1,
    paymentMethod: 'card'
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="relative">
          <img
            src={pkg.images[0]}
            alt={pkg.title}
            className="w-full h-64 object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
            <h2 className="text-3xl font-bold text-white mb-2">{pkg.title}</h2>
            <div className="flex items-center space-x-4 text-white/90">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-1" />
                {pkg.destination}
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-1" />
                {pkg.duration}
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-1" />
                {pkg.departureDate.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-6 px-6">
            {[
              { id: 'overview', label: 'Обзор' },
              { id: 'itinerary', label: 'Маршрут' },
              { id: 'reviews', label: 'Отзывы' },
              { id: 'booking', label: 'Бронирование' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-3 border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600 font-semibold'
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
          {selectedTab === 'overview' && (
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3">О путешествии</h3>
                <p className="text-gray-600">{pkg.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-2">Включено:</h4>
                  <ul className="space-y-1">
                    {pkg.includedServices.map((service, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <span className="text-green-500 mr-2">✓</span>
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Не включено:</h4>
                  <ul className="space-y-1">
                    {pkg.excludedServices.map((service, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <span className="text-red-500 mr-2">✗</span>
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold mb-3">Ваш гид</h4>
                <div className="flex items-start space-x-4">
                  <img
                    src={pkg.guide.avatar}
                    alt={pkg.guide.name}
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{pkg.guide.name}</p>
                    <p className="text-sm text-gray-600 mb-2">{pkg.guide.experience} опыта</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-blue-500 mr-1" />
                        <span>Trust: {pkg.guide.trustScore}</span>
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 text-gray-500 mr-1" />
                        <span>{pkg.guide.responseTime}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pkg.guide.languages.map((lang, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'booking' && (
            <div>
              <div className="mb-6">
                <label className="block font-semibold mb-2">Количество участников</label>
                <input
                  type="number"
                  min="1"
                  max={pkg.maxGroupSize - pkg.currentBookings}
                  value={bookingData.participants}
                  onChange={(e) => setBookingData({ ...bookingData, participants: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Доступно мест: {pkg.maxGroupSize - pkg.currentBookings}
                </p>
              </div>

              <div className="mb-6">
                <label className="block font-semibold mb-2">Способ оплаты</label>
                <div className="space-y-2">
                  {[
                    { id: 'card', label: 'Банковская карта', price: `₽${(pkg.price * bookingData.participants).toLocaleString()}` },
                    { id: 'eth', label: 'Ethereum', price: `${(pkg.cryptoPrice.ETH * bookingData.participants).toFixed(4)} ETH` },
                    { id: 'btc', label: 'Bitcoin', price: `${(pkg.cryptoPrice.BTC * bookingData.participants).toFixed(6)} BTC` },
                    { id: 'usdt', label: 'USDT', price: `${(pkg.cryptoPrice.USDT * bookingData.participants)} USDT` }
                  ].map(method => (
                    <label key={method.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="payment"
                          value={method.id}
                          checked={bookingData.paymentMethod === method.id}
                          onChange={(e) => setBookingData({ ...bookingData, paymentMethod: e.target.value })}
                          className="mr-3"
                        />
                        <span>{method.label}</span>
                      </div>
                      <span className="font-semibold">{method.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                Забронировать
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Guide Registration Component
const GuideRegistration: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Станьте гидом на платформе</h2>
        <p className="text-gray-600 mb-6">
          Делитесь своими знаниями и опытом, создавайте уникальные туры и зарабатывайте в криптовалюте
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Преимущества:</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Прозрачная система репутации на блокчейне
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Мгновенные выплаты в криптовалюте
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Глобальная аудитория путешественников
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Страхование и поддержка платформы
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Требования:</h3>
            <ul className="space-y-2">
              <li className="flex items-center text-gray-600">
                <span className="mr-2">•</span>
                Опыт проведения туров от 1 года
              </li>
              <li className="flex items-center text-gray-600">
                <span className="mr-2">•</span>
                Знание минимум 2 языков
              </li>
              <li className="flex items-center text-gray-600">
                <span className="mr-2">•</span>
                Сертификаты и лицензии (при наличии)
              </li>
              <li className="flex items-center text-gray-600">
                <span className="mr-2">•</span>
                Начальный Trust Score от 50
              </li>
            </ul>
          </div>

          <button className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            Подать заявку
          </button>
        </div>
      </div>
    </div>
  );
};

export default TravelFeature;
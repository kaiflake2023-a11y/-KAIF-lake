/**
 * КАЙФ-ЗНАКОМСТВА - Модуль знакомств для экосистемы Кайф Озеро
 * Dating feature implementation with smart matching and verification
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

// Типы данных для знакомств
interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  interests: string[];
  location: {
    city: string;
    distance?: number;
  };
  preferences: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    maxDistance: number;
  };
  verificationStatus: 'none' | 'photo' | 'id' | 'full';
  trustScore: number;
  lastActive: Date;
  isPremium: boolean;
}

interface Match {
  id: string;
  users: [string, string];
  matchedAt: Date;
  chatStarted: boolean;
  compatibility: number;
  commonInterests: string[];
}

interface DateEvent {
  id: string;
  title: string;
  type: 'speed-dating' | 'group-activity' | 'virtual-meetup';
  date: Date;
  participants: number;
  maxParticipants: number;
  location?: string;
  isVirtual: boolean;
  price?: number;
}

/**
 * Главный компонент знакомств
 */
export const DatingFeature: React.FC = () => {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preferences, setPreferences] = useState({
    gender: 'any' as const,
    ageRange: [18, 35] as [number, number],
    maxDistance: 50,
    interests: [] as string[]
  });

  /**
   * Алгоритм умного подбора пар
   */
  const calculateCompatibility = (profile1: UserProfile, profile2: UserProfile): number => {
    let score = 0;
    
    // Общие интересы (40% веса)
    const commonInterests = profile1.interests.filter(i => 
      profile2.interests.includes(i)
    );
    score += (commonInterests.length / Math.max(profile1.interests.length, 1)) * 40;
    
    // Расстояние (20% веса)
    const distance = profile2.location.distance || 0;
    if (distance <= 10) score += 20;
    else if (distance <= 30) score += 15;
    else if (distance <= 50) score += 10;
    else if (distance <= 100) score += 5;
    
    // Активность (15% веса)
    const hoursSinceActive = (Date.now() - profile2.lastActive.getTime()) / (1000 * 60 * 60);
    if (hoursSinceActive < 24) score += 15;
    else if (hoursSinceActive < 72) score += 10;
    else if (hoursSinceActive < 168) score += 5;
    
    // Верификация (15% веса)
    switch(profile2.verificationStatus) {
      case 'full': score += 15; break;
      case 'id': score += 10; break;
      case 'photo': score += 5; break;
    }
    
    // Trust score (10% веса)
    score += (profile2.trustScore / 100) * 10;
    
    return Math.min(100, score);
  };

  /**
   * Компонент карточки профиля (стиль Tinder)
   */
  const ProfileCard: React.FC<{ profile: UserProfile; onAction: (action: string) => void }> = ({ 
    profile, 
    onAction 
  }) => (
    <View style={styles.card}>
      <Image source={{ uri: profile.photos[0] }} style={styles.cardImage} />
      
      {profile.verificationStatus !== 'none' && (
        <View style={styles.verificationBadge}>
          <Text style={styles.verificationText}>
            {profile.verificationStatus === 'full' ? '✓ Verified' : '✓ Photo'}
          </Text>
        </View>
      )}
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{profile.name}, {profile.age}</Text>
          <Text style={styles.cardDistance}>{profile.location.distance} км</Text>
        </View>
        
        <Text style={styles.cardBio} numberOfLines={3}>{profile.bio}</Text>
        
        <View style={styles.interests}>
          {profile.interests.slice(0, 5).map(interest => (
            <View key={interest} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dislikeButton]}
            onPress={() => onAction('dislike')}
          >
            <Text style={styles.actionIcon}>✕</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.superLikeButton]}
            onPress={() => onAction('superlike')}
          >
            <Text style={styles.actionIcon}>⭐</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => onAction('like')}
          >
            <Text style={styles.actionIcon}>♥</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  /**
   * Секция матчей
   */
  const MatchesSection: React.FC = () => (
    <ScrollView horizontal style={styles.matchesSection}>
      {matches.map(match => (
        <TouchableOpacity key={match.id} style={styles.matchCard}>
          <View style={styles.matchImageContainer}>
            <Image 
              source={{ uri: 'https://placeholder.com/100' }} 
              style={styles.matchImage} 
            />
            {!match.chatStarted && (
              <View style={styles.newMatchBadge}>
                <Text style={styles.newMatchText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.matchCompatibility}>{match.compatibility}%</Text>
          <Text style={styles.matchName}>Match</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  /**
   * Компонент Icebreakers
   */
  const IcebreakersSection: React.FC = () => {
    const icebreakers = [
      "🎬 Какой твой любимый фильм?",
      "🌍 Куда бы ты хотел(а) поехать?",
      "🍕 Пицца или суши?",
      "🎵 Какая музыка тебе нравится?",
      "🏃 Спорт или Netflix?"
    ];
    
    return (
      <View style={styles.icebreakers}>
        <Text style={styles.sectionTitle}>Начните разговор</Text>
        <ScrollView horizontal>
          {icebreakers.map((text, index) => (
            <TouchableOpacity key={index} style={styles.icebreakerCard}>
              <Text style={styles.icebreakerText}>{text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * События для знакомств
   */
  const DatingEventsSection: React.FC = () => {
    const [events, setEvents] = useState<DateEvent[]>([
      {
        id: '1',
        title: 'Speed Dating в Кайф Кафе',
        type: 'speed-dating',
        date: new Date('2025-02-14'),
        participants: 12,
        maxParticipants: 20,
        location: 'Москва, ул. Арбат 10',
        isVirtual: false,
        price: 1500
      },
      {
        id: '2',
        title: 'Виртуальные знакомства',
        type: 'virtual-meetup',
        date: new Date('2025-02-10'),
        participants: 45,
        maxParticipants: 100,
        isVirtual: true,
        price: 0
      }
    ]);
    
    return (
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>События для знакомств</Text>
        {events.map(event => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>
                {event.date.toLocaleDateString('ru-RU')}
              </Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventLocation}>
                {event.isVirtual ? '🌐 Онлайн' : `📍 ${event.location}`}
              </Text>
              <Text style={styles.eventParticipants}>
                {event.participants}/{event.maxParticipants} участников
              </Text>
            </View>
            {event.price !== undefined && (
              <Text style={styles.eventPrice}>
                {event.price === 0 ? 'Бесплатно' : `${event.price} ₽`}
              </Text>
            )}
            <TouchableOpacity style={styles.eventButton}>
              <Text style={styles.eventButtonText}>Записаться</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  /**
   * Настройки предпочтений
   */
  const PreferencesModal: React.FC = () => (
    <View style={styles.preferencesModal}>
      <Text style={styles.modalTitle}>Настройки поиска</Text>
      
      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Возраст: {preferences.ageRange[0]}-{preferences.ageRange[1]}</Text>
        {/* Slider component would go here */}
      </View>
      
      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Максимальное расстояние: {preferences.maxDistance} км</Text>
        {/* Slider component would go here */}
      </View>
      
      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Интересы</Text>
        <View style={styles.interestsGrid}>
          {['Спорт', 'Музыка', 'Путешествия', 'Кино', 'Книги', 'Искусство'].map(interest => (
            <TouchableOpacity 
              key={interest}
              style={[
                styles.interestOption,
                preferences.interests.includes(interest) && styles.interestSelected
              ]}
            >
              <Text style={styles.interestOptionText}>{interest}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  /**
   * Система верификации профиля
   */
  const ProfileVerification: React.FC = () => {
    const verificationSteps = [
      { id: 'photo', title: 'Фото-верификация', icon: '📸', completed: true },
      { id: 'id', title: 'Подтверждение личности', icon: '🆔', completed: false },
      { id: 'social', title: 'Социальные сети', icon: '🔗', completed: true },
      { id: 'video', title: 'Видео-верификация', icon: '🎥', completed: false }
    ];
    
    return (
      <View style={styles.verificationSection}>
        <Text style={styles.sectionTitle}>Верификация профиля</Text>
        <Text style={styles.trustScore}>Trust Score: 75/100</Text>
        
        {verificationSteps.map(step => (
          <View key={step.id} style={styles.verificationStep}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepStatus}>
              {step.completed ? '✅' : '⭕'}
            </Text>
          </View>
        ))}
        
        <TouchableOpacity style={styles.verifyButton}>
          <Text style={styles.verifyButtonText}>Повысить уровень верификации</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Главный рендер
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💕 КАЙФ-ЗНАКОМСТВА</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Text>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Text>💬 {matches.length}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView>
        {/* Карточки профилей */}
        {currentProfile && (
          <ProfileCard 
            profile={currentProfile} 
            onAction={(action) => console.log('Action:', action)}
          />
        )}
        
        {/* Матчи */}
        <MatchesSection />
        
        {/* Icebreakers */}
        <IcebreakersSection />
        
        {/* События */}
        <DatingEventsSection />
        
        {/* Верификация */}
        <ProfileVerification />
      </ScrollView>
    </View>
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
  headerActions: {
    flexDirection: 'row'
  },
  headerButton: {
    marginLeft: 16,
    padding: 8
  },
  card: {
    margin: 16,
    backgroundColor: '#17212b',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5
  },
  cardImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover'
  },
  verificationBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#0088cc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  verificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  cardContent: {
    padding: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  cardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  cardDistance: {
    color: '#8b9398',
    fontSize: 14
  },
  cardBio: {
    color: '#8b9398',
    fontSize: 14,
    marginBottom: 12
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  interestTag: {
    backgroundColor: '#2b5278',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8
  },
  interestText: {
    color: '#fff',
    fontSize: 12
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dislikeButton: {
    backgroundColor: '#ff4458'
  },
  superLikeButton: {
    backgroundColor: '#44d362'
  },
  likeButton: {
    backgroundColor: '#0088cc'
  },
  actionIcon: {
    fontSize: 30,
    color: '#fff'
  },
  matchesSection: {
    paddingHorizontal: 16,
    marginVertical: 20
  },
  matchCard: {
    marginRight: 12,
    alignItems: 'center'
  },
  matchImageContainer: {
    position: 'relative'
  },
  matchImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#0088cc'
  },
  newMatchBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff4458',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  newMatchText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  matchCompatibility: {
    color: '#0088cc',
    fontSize: 12,
    marginTop: 4
  },
  matchName: {
    color: '#fff',
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 16,
    marginBottom: 12
  },
  icebreakers: {
    marginVertical: 20
  },
  icebreakerCard: {
    backgroundColor: '#17212b',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 150
  },
  icebreakerText: {
    color: '#fff',
    fontSize: 14
  },
  eventsSection: {
    marginVertical: 20,
    paddingHorizontal: 16
  },
  eventCard: {
    backgroundColor: '#17212b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1
  },
  eventDate: {
    color: '#8b9398',
    fontSize: 12
  },
  eventInfo: {
    marginBottom: 8
  },
  eventLocation: {
    color: '#8b9398',
    fontSize: 14,
    marginBottom: 4
  },
  eventParticipants: {
    color: '#8b9398',
    fontSize: 12
  },
  eventPrice: {
    color: '#0088cc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  eventButton: {
    backgroundColor: '#0088cc',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  eventButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  preferencesModal: {
    padding: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20
  },
  preferenceItem: {
    marginBottom: 20
  },
  preferenceLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  interestOption: {
    backgroundColor: '#17212b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  interestSelected: {
    backgroundColor: '#0088cc'
  },
  interestOptionText: {
    color: '#fff'
  },
  verificationSection: {
    padding: 16,
    backgroundColor: '#17212b',
    margin: 16,
    borderRadius: 12
  },
  trustScore: {
    color: '#0088cc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  verificationStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 12
  },
  stepTitle: {
    flex: 1,
    color: '#fff'
  },
  stepStatus: {
    fontSize: 16
  },
  verifyButton: {
    backgroundColor: '#0088cc',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default DatingFeature;
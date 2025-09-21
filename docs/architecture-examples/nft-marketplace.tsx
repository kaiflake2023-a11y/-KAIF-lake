/**
 * Пример NFT маркетплейса для будущей реализации
 * Демонстрация концепции создания, покупки и продажи NFT
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Web3 from 'web3';
import { ethers } from 'ethers';

interface NFT {
  id: string;
  tokenId: number;
  name: string;
  description: string;
  image: string;
  creator: string;
  owner: string;
  price: number;
  currency: 'ETH' | 'TON' | 'BNB';
  likes: number;
  views: number;
  category: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  isForSale: boolean;
  createdAt: Date;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  creator: string;
  coverImage: string;
  floorPrice: number;
  totalVolume: number;
  itemCount: number;
  owners: number;
}

/**
 * NFT Маркетплейс компонент
 */
export const NFTMarketplace: React.FC = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'recent' | 'popular'>('recent');

  const categories = [
    { id: 'all', name: 'Все', icon: '🎨' },
    { id: 'art', name: 'Искусство', icon: '🖼️' },
    { id: 'gaming', name: 'Игры', icon: '🎮' },
    { id: 'music', name: 'Музыка', icon: '🎵' },
    { id: 'photo', name: 'Фото', icon: '📷' },
    { id: 'video', name: 'Видео', icon: '🎬' },
    { id: 'memes', name: 'Мемы', icon: '😄' }
  ];

  /**
   * Smart Contract для NFT
   */
  const NFT_CONTRACT_ABI = [
    {
      "inputs": [
        {"name": "tokenURI", "type": "string"},
        {"name": "price", "type": "uint256"}
      ],
      "name": "mintNFT",
      "outputs": [{"name": "", "type": "uint256"}],
      "type": "function"
    },
    {
      "inputs": [
        {"name": "tokenId", "type": "uint256"},
        {"name": "price", "type": "uint256"}
      ],
      "name": "listForSale",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [{"name": "tokenId", "type": "uint256"}],
      "name": "buyNFT",
      "outputs": [],
      "payable": true,
      "type": "function"
    }
  ];

  /**
   * Создание (минтинг) NFT
   */
  const mintNFT = async (
    name: string,
    description: string,
    imageFile: File,
    price: number,
    attributes: any[]
  ): Promise<string> => {
    try {
      // 1. Загрузка изображения в IPFS
      const imageUrl = await uploadToIPFS(imageFile);
      
      // 2. Создание метаданных
      const metadata = {
        name,
        description,
        image: imageUrl,
        attributes,
        created_by: 'Kaif Lake Messenger',
        created_at: new Date().toISOString()
      };
      
      // 3. Загрузка метаданных в IPFS
      const metadataUrl = await uploadMetadataToIPFS(metadata);
      
      // 4. Минтинг NFT в блокчейне
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(
        NFT_CONTRACT_ABI,
        process.env.NFT_CONTRACT_ADDRESS
      );
      
      const result = await contract.methods
        .mintNFT(metadataUrl, web3.utils.toWei(price.toString(), 'ether'))
        .send({ from: accounts[0] });
      
      return result.events.Transfer.returnValues.tokenId;
    } catch (error) {
      console.error('Ошибка минтинга NFT:', error);
      throw error;
    }
  };

  /**
   * Загрузка в IPFS
   */
  const uploadToIPFS = async (file: File): Promise<string> => {
    // Интеграция с Pinata, Infura IPFS или другим сервисом
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: formData
    });
    
    const data = await response.json();
    return `ipfs://${data.IpfsHash}`;
  };

  /**
   * Покупка NFT
   */
  const buyNFT = async (nft: NFT): Promise<void> => {
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(
        NFT_CONTRACT_ABI,
        process.env.NFT_CONTRACT_ADDRESS
      );
      
      await contract.methods
        .buyNFT(nft.tokenId)
        .send({ 
          from: accounts[0],
          value: web3.utils.toWei(nft.price.toString(), 'ether')
        });
      
      // Обновление владельца в локальном состоянии
      setNfts(prev => prev.map(n => 
        n.id === nft.id ? { ...n, owner: accounts[0], isForSale: false } : n
      ));
      
      alert('NFT успешно куплен!');
    } catch (error) {
      console.error('Ошибка покупки NFT:', error);
      alert('Ошибка при покупке NFT');
    }
  };

  /**
   * Компонент создания NFT
   */
  const CreateNFTModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      price: '',
      category: 'art',
      royalties: 10 // процент роялти создателю
    });

    const handleCreate = async () => {
      // Валидация и создание NFT
      console.log('Creating NFT:', formData);
    };

    return (
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>Создать NFT</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Название"
          value={formData.name}
          onChangeText={(text) => setFormData({...formData, name: text})}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Описание"
          value={formData.description}
          multiline
          onChangeText={(text) => setFormData({...formData, description: text})}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Цена (ETH)"
          value={formData.price}
          keyboardType="numeric"
          onChangeText={(text) => setFormData({...formData, price: text})}
        />
        
        <TouchableOpacity style={styles.uploadButton}>
          <Text style={styles.uploadButtonText}>Загрузить изображение</Text>
        </TouchableOpacity>
        
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.buttonText}>Отмена</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Text style={styles.buttonText}>Создать</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * Карточка NFT
   */
  const NFTCard: React.FC<{ nft: NFT }> = ({ nft }) => (
    <TouchableOpacity style={styles.nftCard}>
      <Image source={{ uri: nft.image }} style={styles.nftImage} />
      
      <View style={styles.nftInfo}>
        <Text style={styles.nftName}>{nft.name}</Text>
        <Text style={styles.nftCreator}>@{nft.creator}</Text>
        
        <View style={styles.nftStats}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>❤️</Text>
            <Text style={styles.statValue}>{nft.likes}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>👁️</Text>
            <Text style={styles.statValue}>{nft.views}</Text>
          </View>
        </View>
        
        {nft.isForSale && (
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{nft.price} {nft.currency}</Text>
            <TouchableOpacity 
              style={styles.buyButton}
              onPress={() => buyNFT(nft)}
            >
              <Text style={styles.buyButtonText}>Купить</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  /**
   * Компонент коллекции
   */
  const CollectionCard: React.FC<{ collection: Collection }> = ({ collection }) => (
    <TouchableOpacity style={styles.collectionCard}>
      <Image source={{ uri: collection.coverImage }} style={styles.collectionImage} />
      
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionName}>{collection.name}</Text>
        <Text style={styles.collectionCreator}>by @{collection.creator}</Text>
        
        <View style={styles.collectionStats}>
          <View style={styles.collectionStat}>
            <Text style={styles.statLabel}>Минимальная цена</Text>
            <Text style={styles.statValue}>{collection.floorPrice} ETH</Text>
          </View>
          <View style={styles.collectionStat}>
            <Text style={styles.statLabel}>Объем торгов</Text>
            <Text style={styles.statValue}>{collection.totalVolume} ETH</Text>
          </View>
          <View style={styles.collectionStat}>
            <Text style={styles.statLabel}>Предметов</Text>
            <Text style={styles.statValue}>{collection.itemCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Компонент аукциона
   */
  const AuctionSection: React.FC = () => {
    const [auctions, setAuctions] = useState([]);
    
    return (
      <View style={styles.auctionSection}>
        <Text style={styles.sectionTitle}>🔥 Горячие аукционы</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Карточки активных аукционов */}
        </ScrollView>
      </View>
    );
  };

  // Главный рендер
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NFT Маркетплейс</Text>
        <TouchableOpacity style={styles.createNFTButton}>
          <Text style={styles.createNFTButtonText}>+ Создать NFT</Text>
        </TouchableOpacity>
      </View>

      {/* Категории */}
      <ScrollView horizontal style={styles.categories} showsHorizontalScrollIndicator={false}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={styles.categoryName}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Поиск и фильтры */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск NFT, коллекций, создателей..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.filterButton}>
          <Text>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Топ коллекции */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Топ коллекции</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {collections.map(collection => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </ScrollView>
      </View>

      {/* Аукционы */}
      <AuctionSection />

      {/* NFT сетка */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Исследовать NFT</Text>
        <View style={styles.nftGrid}>
          {nfts.map(nft => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

// Стили компонента
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0e1621'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  createNFTButton: {
    backgroundColor: '#0088cc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  createNFTButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  categories: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17212b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8
  },
  categoryActive: {
    backgroundColor: '#0088cc'
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 4
  },
  categoryName: {
    color: '#fff',
    fontSize: 14
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#17212b',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8
  },
  filterButton: {
    backgroundColor: '#17212b',
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  nftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12
  },
  nftCard: {
    width: '48%',
    backgroundColor: '#17212b',
    borderRadius: 12,
    margin: '1%',
    overflow: 'hidden'
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1
  },
  nftInfo: {
    padding: 12
  },
  nftName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  nftCreator: {
    color: '#8b9398',
    fontSize: 12,
    marginTop: 2
  },
  nftStats: {
    flexDirection: 'row',
    marginTop: 8
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12
  },
  statIcon: {
    fontSize: 12,
    marginRight: 4
  },
  statValue: {
    color: '#8b9398',
    fontSize: 12
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  price: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  buyButton: {
    backgroundColor: '#0088cc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  collectionCard: {
    width: 200,
    backgroundColor: '#17212b',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden'
  },
  collectionImage: {
    width: '100%',
    height: 120
  },
  collectionInfo: {
    padding: 12
  },
  collectionName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  collectionCreator: {
    color: '#8b9398',
    fontSize: 12,
    marginTop: 2
  },
  collectionStats: {
    marginTop: 8
  },
  collectionStat: {
    marginTop: 4
  },
  statLabel: {
    color: '#8b9398',
    fontSize: 10
  },
  auctionSection: {
    marginBottom: 24
  }
};

export default NFTMarketplace;
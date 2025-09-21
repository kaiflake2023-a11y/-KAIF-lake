# Архитектура системы "Кайф Озеро"

## Микросервисная архитектура

### Схема микросервисов

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                    (Kong / AWS API Gateway)                      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬──────────────┬──────────────┐
    │             │             │              │              │
┌───▼────┐ ┌─────▼────┐ ┌──────▼─────┐ ┌─────▼─────┐ ┌──────▼────┐
│  Auth   │ │Messaging │ │   Crypto   │ │Marketplace│ │   Media   │
│ Service │ │  Service │ │   Service  │ │  Service  │ │  Service  │
└────┬────┘ └────┬─────┘ └─────┬──────┘ └─────┬─────┘ └─────┬─────┘
     │           │             │              │             │
┌────▼───────────▼─────────────▼──────────────▼─────────────▼────┐
│                        Message Queue (Kafka)                     │
└──────────────────────────────────────────────────────────────────┘
     │           │             │              │             │
┌────▼────┐ ┌───▼────┐ ┌──────▼─────┐ ┌─────▼─────┐ ┌──────▼────┐
│PostgreSQL│ │  Redis │ │  MongoDB   │ │Blockchain │ │    S3     │
└──────────┘ └────────┘ └────────────┘ └───────────┘ └───────────┘
```

### Описание сервисов

#### 1. Auth Service (Сервис авторизации)
**Технологии**: Node.js, Express, JWT, Passport.js
**База данных**: PostgreSQL
**Функции**:
- Регистрация и авторизация пользователей
- Управление сессиями
- 2FA аутентификация
- OAuth интеграции (Google, GitHub, VK)
- Управление правами доступа (RBAC)

```typescript
// auth-service/src/controllers/auth.controller.ts
export class AuthController {
  async register(req: Request, res: Response) {
    const { username, email, password } = req.body;
    
    // Валидация
    const errors = await validateRegistration(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    // Хэширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создание пользователя
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });
    
    // Генерация токенов
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Отправка приветственного email
    await emailService.sendWelcomeEmail(user.email);
    
    return res.json({
      user: user.toJSON(),
      accessToken,
      refreshToken
    });
  }
  
  async enable2FA(req: Request, res: Response) {
    const user = req.user;
    const secret = speakeasy.generateSecret();
    
    await User.update(
      { twoFactorSecret: secret.base32 },
      { where: { id: user.id } }
    );
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    return res.json({ qrCode, secret: secret.base32 });
  }
}
```

#### 2. Messaging Service (Сервис сообщений)
**Технологии**: Node.js, Socket.io, Redis Pub/Sub
**База данных**: MongoDB, Redis
**Функции**:
- Отправка и получение сообщений
- Управление чатами и каналами
- Real-time уведомления
- Шифрование сообщений
- Медиа-сообщения

```typescript
// messaging-service/src/services/message.service.ts
export class MessageService {
  private io: Server;
  private redis: RedisClient;
  
  async sendMessage(chatId: string, senderId: string, content: string) {
    // Проверка прав доступа
    const hasAccess = await this.checkChatAccess(chatId, senderId);
    if (!hasAccess) {
      throw new UnauthorizedError('No access to chat');
    }
    
    // Создание сообщения
    const message = await Message.create({
      chatId,
      senderId,
      content,
      timestamp: new Date()
    });
    
    // Шифрование для secret чатов
    if (await this.isSecretChat(chatId)) {
      message.content = await this.encryptMessage(content, chatId);
    }
    
    // Отправка через WebSocket
    this.io.to(chatId).emit('new_message', message);
    
    // Публикация в Redis для других серверов
    this.redis.publish(`chat:${chatId}`, JSON.stringify(message));
    
    // Push уведомления офлайн пользователям
    await this.sendPushNotifications(chatId, message);
    
    return message;
  }
  
  async createSecretChat(user1Id: string, user2Id: string) {
    // Генерация ключей шифрования
    const { publicKey, privateKey } = await generateKeyPair();
    
    const chat = await Chat.create({
      type: 'secret',
      members: [user1Id, user2Id],
      encryptionKey: publicKey,
      createdAt: new Date()
    });
    
    return chat;
  }
}
```

#### 3. Crypto Service (Криптовалютный сервис)
**Технологии**: Node.js, Web3.js, Ethers.js
**Интеграции**: Ethereum, TON, Binance Smart Chain
**Функции**:
- Управление кошельками
- Отправка и получение криптовалюты
- Обмен через DEX
- Интеграция с блокчейнами
- P2P торговля

```typescript
// crypto-service/src/services/wallet.service.ts
export class WalletService {
  private web3: Web3;
  private tonClient: TonClient;
  
  async createWallet(userId: string, currency: string) {
    let wallet: Wallet;
    
    switch(currency) {
      case 'ETH':
        const account = this.web3.eth.accounts.create();
        wallet = {
          address: account.address,
          privateKey: this.encrypt(account.privateKey),
          currency: 'ETH'
        };
        break;
        
      case 'TON':
        const tonWallet = await this.tonClient.createWallet();
        wallet = {
          address: tonWallet.address,
          privateKey: this.encrypt(tonWallet.secretKey),
          currency: 'TON'
        };
        break;
    }
    
    // Сохранение в базе данных
    await Wallet.create({
      userId,
      ...wallet
    });
    
    return wallet;
  }
  
  async sendTransaction(
    fromWallet: string,
    toAddress: string,
    amount: number,
    currency: string
  ) {
    const wallet = await Wallet.findOne({ address: fromWallet });
    const privateKey = this.decrypt(wallet.privateKey);
    
    let txHash: string;
    
    if (currency === 'ETH') {
      const nonce = await this.web3.eth.getTransactionCount(fromWallet);
      const gasPrice = await this.web3.eth.getGasPrice();
      
      const tx = {
        from: fromWallet,
        to: toAddress,
        value: this.web3.utils.toWei(amount.toString(), 'ether'),
        gas: 21000,
        gasPrice,
        nonce
      };
      
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      txHash = receipt.transactionHash;
    }
    
    // Сохранение транзакции
    await Transaction.create({
      from: fromWallet,
      to: toAddress,
      amount,
      currency,
      txHash,
      status: 'completed'
    });
    
    return txHash;
  }
}
```

#### 4. Marketplace Service (Сервис маркетплейса)
**Технологии**: Node.js, GraphQL, Elasticsearch
**База данных**: PostgreSQL, Elasticsearch
**Функции**:
- Управление товарами и услугами
- NFT маркетплейс
- Система заказов
- Рейтинги и отзывы
- Поиск и фильтрация

```typescript
// marketplace-service/src/resolvers/product.resolver.ts
export const productResolvers = {
  Query: {
    products: async (_, { filter, sort, limit, offset }) => {
      const query = buildElasticsearchQuery(filter);
      
      const results = await elasticClient.search({
        index: 'products',
        body: {
          query,
          sort: buildSort(sort),
          from: offset,
          size: limit
        }
      });
      
      return results.hits.hits.map(hit => hit._source);
    },
    
    product: async (_, { id }) => {
      return await Product.findById(id);
    }
  },
  
  Mutation: {
    createProduct: async (_, { input }, { user }) => {
      // Валидация прав продавца
      if (!user.isSeller) {
        throw new ForbiddenError('Only sellers can create products');
      }
      
      const product = await Product.create({
        ...input,
        sellerId: user.id,
        status: 'pending_moderation'
      });
      
      // Индексация в Elasticsearch
      await elasticClient.index({
        index: 'products',
        id: product.id,
        body: product.toJSON()
      });
      
      // Отправка на модерацию
      await moderationQueue.add('moderate_product', { productId: product.id });
      
      return product;
    },
    
    createOrder: async (_, { productId, quantity }, { user }) => {
      const product = await Product.findById(productId);
      
      if (product.stock < quantity) {
        throw new Error('Insufficient stock');
      }
      
      const order = await Order.create({
        buyerId: user.id,
        sellerId: product.sellerId,
        productId,
        quantity,
        totalAmount: product.price * quantity,
        status: 'pending_payment'
      });
      
      // Создание платежа
      const payment = await paymentService.createPayment({
        orderId: order.id,
        amount: order.totalAmount,
        currency: product.currency
      });
      
      return {
        order,
        paymentUrl: payment.url
      };
    }
  }
};
```

#### 5. Media Service (Медиа сервис)
**Технологии**: Node.js, FFmpeg, Sharp
**Хранилище**: S3, CDN
**Функции**:
- Загрузка и обработка изображений
- Видео транскодинг
- Генерация превью
- Оптимизация для разных устройств
- CDN интеграция

```typescript
// media-service/src/services/media.service.ts
export class MediaService {
  private s3: AWS.S3;
  private cdn: CloudflareCDN;
  
  async uploadImage(file: Express.Multer.File, userId: string) {
    // Валидация
    if (!this.isValidImageType(file.mimetype)) {
      throw new Error('Invalid image type');
    }
    
    // Обработка изображения
    const variants = await this.processImage(file.buffer);
    
    // Загрузка в S3
    const uploadPromises = variants.map(variant => {
      return this.s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: `images/${userId}/${variant.name}`,
        Body: variant.buffer,
        ContentType: file.mimetype
      }).promise();
    });
    
    const results = await Promise.all(uploadPromises);
    
    // Очистка CDN кэша
    await this.cdn.purgeCache(results.map(r => r.Location));
    
    return {
      original: results[0].Location,
      thumbnail: results[1].Location,
      medium: results[2].Location
    };
  }
  
  private async processImage(buffer: Buffer) {
    const sharp = require('sharp');
    
    return Promise.all([
      // Оригинал с оптимизацией
      {
        name: 'original.webp',
        buffer: await sharp(buffer)
          .webp({ quality: 90 })
          .toBuffer()
      },
      // Миниатюра
      {
        name: 'thumb.webp',
        buffer: await sharp(buffer)
          .resize(200, 200, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer()
      },
      // Средний размер
      {
        name: 'medium.webp',
        buffer: await sharp(buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer()
      }
    ]);
  }
  
  async processVideo(videoPath: string) {
    const ffmpeg = require('fluent-ffmpeg');
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 22',
          '-c:a aac',
          '-b:a 128k'
        ])
        .on('end', resolve)
        .on('error', reject)
        .save('output.mp4');
    });
  }
}
```

### Инфраструктурные компоненты

#### API Gateway
- Маршрутизация запросов
- Rate limiting
- Аутентификация
- Логирование
- Балансировка нагрузки

#### Message Queue (Kafka)
- Асинхронная обработка задач
- Event sourcing
- Межсервисная коммуникация
- Обработка больших объемов данных

#### Cache Layer (Redis)
- Кэширование данных
- Управление сессиями
- Pub/Sub для real-time
- Rate limiting счетчики

#### Monitoring Stack
- **Prometheus**: Сбор метрик
- **Grafana**: Визуализация
- **ELK Stack**: Логирование
- **Sentry**: Error tracking
- **Jaeger**: Distributed tracing

### Deployment Architecture

```yaml
# docker-compose.yml
version: '3.8'

services:
  auth-service:
    image: kaif-lake/auth-service:latest
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3000"
    
  messaging-service:
    image: kaif-lake/messaging-service:latest
    environment:
      - MONGODB_URI=mongodb://mongo:27017/messaging
      - REDIS_HOST=redis
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - mongo
      - redis
      - kafka
    ports:
      - "3002:3000"
    
  crypto-service:
    image: kaif-lake/crypto-service:latest
    environment:
      - ETH_NODE_URL=${ETH_NODE_URL}
      - TON_API_KEY=${TON_API_KEY}
      - DB_HOST=postgres
    depends_on:
      - postgres
    ports:
      - "3003:3000"
    
  marketplace-service:
    image: kaif-lake/marketplace-service:latest
    environment:
      - DB_HOST=postgres
      - ELASTIC_HOST=elasticsearch:9200
      - S3_BUCKET=${S3_BUCKET}
    depends_on:
      - postgres
      - elasticsearch
    ports:
      - "3004:3000"
    
  media-service:
    image: kaif-lake/media-service:latest
    environment:
      - S3_BUCKET=${S3_BUCKET}
      - CDN_URL=${CDN_URL}
    ports:
      - "3005:3000"
  
  # Инфраструктура
  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=kaif_lake
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  mongo:
    image: mongo:5
    volumes:
      - mongo_data:/data/db
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    
  elasticsearch:
    image: elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elastic_data:/usr/share/elasticsearch/data
    
  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      - KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
    depends_on:
      - zookeeper
    
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      - ZOOKEEPER_CLIENT_PORT=2181
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - auth-service
      - messaging-service
      - crypto-service
      - marketplace-service
      - media-service

volumes:
  postgres_data:
  mongo_data:
  redis_data:
  elastic_data:
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: kaif-lake
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: kaif-lake/auth-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: kaif-lake
spec:
  selector:
    app: auth-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: kaif-lake
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Безопасность

### Шифрование
- TLS 1.3 для всех соединений
- E2E шифрование для secret чатов
- Шифрование данных в покое (AES-256)
- Хэширование паролей (Argon2)

### Аутентификация
- JWT с коротким временем жизни
- Refresh токены
- 2FA через TOTP
- Биометрическая аутентификация

### Защита от атак
- Rate limiting на всех endpoints
- DDoS защита через Cloudflare
- SQL injection защита
- XSS/CSRF защита
- Input validation

### Compliance
- GDPR соответствие
- PCI DSS для платежей
- KYC/AML для крипто операций
- Логирование всех действий

## Мониторинг и аналитика

### Метрики производительности
- Response time < 200ms (p95)
- Uptime > 99.9%
- Error rate < 0.1%
- Throughput > 10k RPS

### Бизнес-метрики
- DAU/MAU
- Retention rate
- Conversion rate
- Average revenue per user
- Churn rate

### Технические метрики
- CPU/Memory использование
- Database query time
- Cache hit rate
- Queue depth
- Network latency

## Масштабирование

### Горизонтальное масштабирование
- Auto-scaling по метрикам
- Load balancing
- Database sharding
- Cache clustering

### Вертикальное масштабирование
- Оптимизация запросов
- Индексирование БД
- Code profiling
- Resource optimization

### Географическое масштабирование
- Multi-region deployment
- CDN для статики
- Edge computing
- Data replication
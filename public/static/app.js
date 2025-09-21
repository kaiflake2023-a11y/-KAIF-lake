// Initialize dayjs plugins
dayjs.locale('ru');
dayjs.extend(dayjs_plugin_relativeTime);

// Global app state
const app = {
  user: null,
  token: localStorage.getItem('token'),
  currentChat: null,
  chats: [],
  messages: [],
  contacts: [],
  pollInterval: null,
  currentView: 'chats', // текущий раздел приложения
  menuOpen: false
};

// API configuration
const API_URL = '/api';

// API helper
async function apiCall(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(app.token ? { 'Authorization': `Bearer ${app.token}` } : {}),
      ...options.headers
    }
  };
  
  try {
    const response = await axios(`${API_URL}${endpoint}`, config);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      logout();
    }
    throw error;
  }
}

// Auth functions
async function login(credentials) {
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      data: credentials
    });
    
    app.token = data.token;
    app.user = data.user;
    localStorage.setItem('token', data.token);
    
    await initializeApp();
  } catch (error) {
    showError('Неверные учетные данные');
  }
}

async function register(userData) {
  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      data: userData
    });
    
    app.token = data.token;
    app.user = data.user;
    localStorage.setItem('token', data.token);
    
    await initializeApp();
  } catch (error) {
    showError(error.response?.data?.error || 'Ошибка регистрации');
  }
}

function logout() {
  app.token = null;
  app.user = null;
  app.currentChat = null;
  localStorage.removeItem('token');
  
  if (app.pollInterval) {
    clearInterval(app.pollInterval);
  }
  
  renderAuthScreen();
}

// Initialize app
async function initializeApp() {
  if (!app.token) {
    renderAuthScreen();
    return;
  }
  
  try {
    // Get current user
    app.user = await apiCall('/users/me');
    
    // Load chats
    await loadChats();
    
    // Start polling for new messages
    startPolling();
    
    // Set default view to chats
    app.currentView = 'chats';
    app.menuOpen = true; // Start with menu open
    
    // Render main interface
    renderMainInterface();
  } catch (error) {
    console.error('Init error:', error);
    renderAuthScreen();
  }
}

// Load chats
async function loadChats() {
  try {
    app.chats = await apiCall('/chats');
  } catch (error) {
    console.error('Failed to load chats:', error);
  }
}

// Load messages for current chat
async function loadMessages() {
  if (!app.currentChat) return;
  
  try {
    app.messages = await apiCall(`/messages?chat_id=${app.currentChat.id}`);
    renderMessages();
    
    // Mark as read
    if (app.messages.length > 0) {
      const lastMessage = app.messages[app.messages.length - 1];
      await apiCall(`/chats/${app.currentChat.id}/read`, {
        method: 'POST',
        data: { message_id: lastMessage.id }
      });
    }
  } catch (error) {
    console.error('Failed to load messages:', error);
  }
}

// Send message
async function sendMessage(content) {
  if (!app.currentChat || !content.trim()) return;
  
  try {
    const message = await apiCall('/messages', {
      method: 'POST',
      data: {
        chat_id: app.currentChat.id,
        content: content.trim(),
        type: 'text'
      }
    });
    
    app.messages.push(message);
    renderMessages();
    
    // Scroll to bottom
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    showError('Не удалось отправить сообщение');
  }
}

// Create or open direct chat
async function createDirectChat(userId) {
  try {
    const data = await apiCall('/chats', {
      method: 'POST',
      data: {
        type: 'direct',
        member_ids: [userId]
      }
    });
    
    await loadChats();
    const chat = app.chats.find(c => c.id === data.id);
    if (chat) {
      selectChat(chat);
    }
  } catch (error) {
    console.error('Failed to create chat:', error);
  }
}

// Select chat
async function selectChat(chat) {
  app.currentChat = chat;
  await loadMessages();
  renderMainInterface();
}

// Search users
async function searchUsers(query) {
  if (query.length < 2) return [];
  
  try {
    return await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// Start polling for updates
function startPolling() {
  if (app.pollInterval) {
    clearInterval(app.pollInterval);
  }
  
  app.pollInterval = setInterval(async () => {
    if (app.currentChat) {
      await loadMessages();
    }
    await loadChats();
    renderChatList();
  }, 3000); // Poll every 3 seconds
}

// UI Rendering functions
function renderAuthScreen() {
  document.getElementById('app').innerHTML = `
    <div class="flex items-center justify-center h-screen bg-telegram-bg">
      <div class="w-full max-w-md p-8">
        <div class="text-center mb-8">
          <i class="fas fa-comment-dots text-6xl text-telegram-accent mb-4"></i>
          <h1 class="text-3xl font-bold">Кайф Озеро</h1>
          <p class="text-telegram-secondary mt-2">Простой и быстрый мессенджер</p>
        </div>
        
        <div id="auth-form" class="bg-telegram-sidebar rounded-lg p-6">
          <div class="mb-4">
            <button onclick="showLoginForm()" class="w-full py-2 px-4 bg-telegram-accent rounded hover:bg-blue-600 transition mb-2">
              Войти
            </button>
            <button onclick="showRegisterForm()" class="w-full py-2 px-4 bg-telegram-hover rounded hover:bg-telegram-active transition">
              Регистрация
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  showLoginForm();
}

function showLoginForm() {
  document.getElementById('auth-form').innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Вход</h2>
    <form onsubmit="handleLogin(event)">
      <input type="text" id="login-username" placeholder="Имя пользователя или email" 
        class="w-full p-3 mb-3 bg-telegram-input rounded border border-telegram-border focus:border-telegram-accent focus:outline-none">
      <input type="password" id="login-password" placeholder="Пароль" 
        class="w-full p-3 mb-4 bg-telegram-input rounded border border-telegram-border focus:border-telegram-accent focus:outline-none">
      <button type="submit" class="w-full py-3 bg-telegram-accent rounded hover:bg-blue-600 transition">
        Войти
      </button>
    </form>
    <p class="mt-4 text-center text-telegram-secondary">
      Нет аккаунта? <a href="#" onclick="showRegisterForm()" class="text-telegram-accent hover:underline">Зарегистрироваться</a>
    </p>
  `;
}

function showRegisterForm() {
  document.getElementById('auth-form').innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Регистрация</h2>
    <form onsubmit="handleRegister(event)">
      <input type="text" id="reg-username" placeholder="Имя пользователя" 
        class="w-full p-3 mb-3 bg-telegram-input rounded border border-telegram-border focus:border-telegram-accent focus:outline-none">
      <input type="email" id="reg-email" placeholder="Email" 
        class="w-full p-3 mb-3 bg-telegram-input rounded border border-telegram-border focus:border-telegram-accent focus:outline-none">
      <input type="text" id="reg-display-name" placeholder="Отображаемое имя" 
        class="w-full p-3 mb-3 bg-telegram-input rounded border border-telegram-border focus:border-telegram-accent focus:outline-none">
      <input type="password" id="reg-password" placeholder="Пароль (минимум 6 символов)" 
        class="w-full p-3 mb-4 bg-telegram-input rounded border border-telegram-border focus:border-telegram-accent focus:outline-none">
      <button type="submit" class="w-full py-3 bg-telegram-accent rounded hover:bg-blue-600 transition">
        Зарегистрироваться
      </button>
    </form>
    <p class="mt-4 text-center text-telegram-secondary">
      Уже есть аккаунт? <a href="#" onclick="showLoginForm()" class="text-telegram-accent hover:underline">Войти</a>
    </p>
  `;
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  const credentials = username.includes('@') 
    ? { email: username, password }
    : { username, password };
  
  await login(credentials);
}

async function handleRegister(event) {
  event.preventDefault();
  const userData = {
    username: document.getElementById('reg-username').value,
    email: document.getElementById('reg-email').value,
    display_name: document.getElementById('reg-display-name').value,
    password: document.getElementById('reg-password').value
  };
  
  await register(userData);
}

function renderMainInterface() {
  const html = `
    <div class="flex h-screen">
      <!-- Enhanced Sidebar with Ecosystem Menu -->
      <div class="${app.menuOpen ? 'w-80' : 'w-16'} bg-telegram-sidebar border-r border-telegram-border flex flex-col transition-all duration-300">
        <!-- Header -->
        <div class="p-4 border-b border-telegram-border">
          <div class="flex items-center ${app.menuOpen ? 'justify-between' : 'justify-center'}">
            <button onclick="toggleMenu()" class="p-2 hover:bg-telegram-hover rounded" title="Меню">
              <i class="fas ${app.menuOpen ? 'fa-times' : 'fa-bars'} text-telegram-text"></i>
            </button>
            ${app.menuOpen ? `
              <h1 class="text-lg font-semibold">Кайф Озеро</h1>
              <button onclick="showSearchModal()" class="p-2 hover:bg-telegram-hover rounded">
                <i class="fas fa-search text-telegram-secondary"></i>
              </button>
            ` : ''}
          </div>
        </div>
        
        <!-- Ecosystem Menu -->
        <div class="${app.menuOpen ? 'block' : 'hidden'} border-b border-telegram-border">
          <nav class="p-2">
            ${renderEcosystemMenu()}
          </nav>
        </div>
        
        <!-- User Info (when menu open) -->
        ${app.menuOpen ? `
          <div class="p-4 border-b border-telegram-border">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-telegram-accent rounded-full flex items-center justify-center mr-3">
                <i class="fas fa-user"></i>
              </div>
              <div class="flex-1">
                <div class="font-semibold text-sm">${app.user?.display_name || ''}</div>
                <div class="text-xs text-telegram-secondary">@${app.user?.username || ''}</div>
              </div>
              <button onclick="logout()" class="p-2 hover:bg-telegram-hover rounded" title="Выйти">
                <i class="fas fa-sign-out-alt text-telegram-secondary"></i>
              </button>
            </div>
          </div>
        ` : ''}
        
        <!-- Content based on current view -->
        <div id="sidebar-content" class="flex-1 overflow-y-auto">
          ${app.menuOpen ? renderSidebarContent() : renderCompactMenu()}
        </div>
      </div>
      
      <!-- Main content -->
      <div class="flex-1 flex flex-col">
        ${app.currentView === 'chats' ? (app.currentChat ? renderChatView() : renderEmptyState()) : ''}
      </div>
    </div>
    
    <!-- Search Modal -->
    <div id="search-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-telegram-sidebar rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">Поиск пользователей</h3>
        <input type="text" id="user-search" placeholder="Введите имя пользователя..." 
          oninput="handleUserSearch(this.value)"
          class="w-full p-3 mb-4 bg-telegram-input rounded border border-telegram-border focus:border-telegram-accent focus:outline-none">
        <div id="search-results"></div>
        <button onclick="hideSearchModal()" class="mt-4 w-full py-2 bg-telegram-hover rounded hover:bg-telegram-active">
          Закрыть
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
}

function renderChatListContent() {
  if (app.chats.length === 0) {
    return `
      <div class="p-4 text-center text-telegram-secondary">
        <p>Нет активных чатов</p>
        <button onclick="showSearchModal()" class="mt-2 text-telegram-accent hover:underline">
          Найти пользователей
        </button>
      </div>
    `;
  }
  
  return app.chats.map(chat => `
    <div onclick="selectChat('${chat.id}')" 
      class="p-3 hover:bg-telegram-hover cursor-pointer ${app.currentChat?.id === chat.id ? 'bg-telegram-active' : ''}">
      <div class="flex items-center">
        <div class="w-12 h-12 bg-telegram-accent rounded-full flex items-center justify-center mr-3">
          <i class="fas ${chat.type === 'group' ? 'fa-users' : 'fa-user'}"></i>
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-start">
            <div class="font-semibold">${chat.name || 'Чат'}</div>
            <div class="text-xs text-telegram-secondary">
              ${chat.last_message ? dayjs(chat.last_message.created_at).fromNow() : ''}
            </div>
          </div>
          <div class="text-sm text-telegram-secondary truncate">
            ${chat.last_message ? chat.last_message.content : 'Нет сообщений'}
          </div>
        </div>
        ${chat.unread_count > 0 ? `
          <div class="ml-2 bg-telegram-accent text-white text-xs rounded-full px-2 py-1">
            ${chat.unread_count}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function renderChatList() {
  const chatList = document.getElementById('chat-list');
  if (chatList) {
    chatList.innerHTML = renderChatListContent();
  }
}

function renderEmptyState() {
  return `
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-comments text-6xl text-telegram-secondary mb-4"></i>
        <p class="text-telegram-secondary">Выберите чат или начните новый диалог</p>
      </div>
    </div>
  `;
}

function renderChatView() {
  return `
    <!-- Chat header -->
    <div class="p-4 border-b border-telegram-border bg-telegram-sidebar">
      <div class="flex items-center">
        <div class="w-10 h-10 bg-telegram-accent rounded-full flex items-center justify-center mr-3">
          <i class="fas ${app.currentChat.type === 'group' ? 'fa-users' : 'fa-user'}"></i>
        </div>
        <div>
          <div class="font-semibold">${app.currentChat.name || 'Чат'}</div>
          <div class="text-sm text-telegram-secondary">
            ${app.currentChat.other_user?.is_online ? 'в сети' : 'был(а) недавно'}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Messages -->
    <div id="messages-container" class="flex-1 overflow-y-auto p-4">
      ${renderMessagesContent()}
    </div>
    
    <!-- Input -->
    <div class="p-4 border-t border-telegram-border bg-telegram-sidebar">
      <form onsubmit="handleSendMessage(event)" class="flex items-center">
        <input type="text" id="message-input" placeholder="Написать сообщение..." 
          class="flex-1 p-3 bg-telegram-input rounded-l border border-telegram-border focus:border-telegram-accent focus:outline-none">
        <button type="submit" class="px-6 py-3 bg-telegram-accent rounded-r hover:bg-blue-600 transition">
          <i class="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  `;
}

function renderMessagesContent() {
  if (app.messages.length === 0) {
    return '<div class="text-center text-telegram-secondary">Нет сообщений</div>';
  }
  
  return app.messages.map(msg => `
    <div class="mb-4 ${msg.sender_id === app.user.id ? 'text-right' : ''}">
      <div class="inline-block max-w-xs lg:max-w-md">
        <div class="${msg.sender_id === app.user.id 
          ? 'bg-telegram-accent text-white' 
          : 'bg-telegram-sidebar'} rounded-lg px-4 py-2">
          ${msg.sender_id !== app.user.id ? `
            <div class="font-semibold text-sm mb-1">${msg.display_name}</div>
          ` : ''}
          <div>${msg.content || ''}</div>
          <div class="text-xs ${msg.sender_id === app.user.id ? 'text-blue-100' : 'text-telegram-secondary'} mt-1">
            ${dayjs(msg.created_at).format('HH:mm')}
            ${msg.is_edited ? '(изменено)' : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderMessages() {
  const container = document.getElementById('messages-container');
  if (container) {
    container.innerHTML = renderMessagesContent();
  }
}

async function handleSendMessage(event) {
  event.preventDefault();
  const input = document.getElementById('message-input');
  if (input && input.value.trim()) {
    await sendMessage(input.value);
    input.value = '';
  }
}

async function handleUserSearch(query) {
  const resultsDiv = document.getElementById('search-results');
  if (query.length < 2) {
    resultsDiv.innerHTML = '<p class="text-telegram-secondary">Введите минимум 2 символа</p>';
    return;
  }
  
  const users = await searchUsers(query);
  
  if (users.length === 0) {
    resultsDiv.innerHTML = '<p class="text-telegram-secondary">Пользователи не найдены</p>';
    return;
  }
  
  resultsDiv.innerHTML = users.map(user => `
    <div onclick="createDirectChat('${user.id}')" 
      class="p-3 hover:bg-telegram-hover rounded cursor-pointer mb-2">
      <div class="flex items-center">
        <div class="w-10 h-10 bg-telegram-accent rounded-full flex items-center justify-center mr-3">
          <i class="fas fa-user"></i>
        </div>
        <div>
          <div class="font-semibold">${user.display_name}</div>
          <div class="text-sm text-telegram-secondary">@${user.username}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function selectChat(chatId) {
  const chat = app.chats.find(c => c.id === chatId);
  if (chat) {
    app.currentChat = chat;
    loadMessages();
    renderMainInterface();
  }
}

function toggleMenu() {
  app.menuOpen = !app.menuOpen;
  renderMainInterface();
}

// Render ecosystem menu items
function renderEcosystemMenu() {
  const menuItems = [
    { id: 'chats', icon: 'fa-comments', label: 'Чаты', active: true, badge: app.chats.length },
    { id: 'wallet', icon: 'fa-wallet', label: 'Кошелек', status: 'soon', color: 'text-yellow-400' },
    { id: 'nft', icon: 'fa-image', label: 'NFT Маркет', status: 'soon', color: 'text-purple-400' },
    { id: 'marketplace', icon: 'fa-shopping-cart', label: 'Маркетплейс', status: 'soon', color: 'text-green-400' },
    { id: 'dating', icon: 'fa-heart-pulse', label: '💕 Знакомства', status: 'new', color: 'text-red-500' },
    { id: 'lottery', icon: 'fa-dice', label: '🎰 Лотерея', status: 'new', color: 'text-yellow-500' },
    { id: 'travel', icon: 'fa-plane', label: '✈️ Путешествия', status: 'new', color: 'text-blue-500' },
    { id: 'rental', icon: 'fa-key', label: '🚗 Аренда', status: 'new', color: 'text-green-500' },
    { id: 'events', icon: 'fa-calendar-star', label: '🎉 События', status: 'new', color: 'text-purple-500' },
    { id: 'crowdfunding', icon: 'fa-hand-holding-usd', label: 'Краудфандинг', status: 'planned', color: 'text-blue-400' },
    { id: 'library', icon: 'fa-book', label: 'Библиотека', status: 'planned', color: 'text-indigo-400' },
    { id: 'freelance', icon: 'fa-briefcase', label: 'Биржа труда', status: 'planned', color: 'text-orange-400' },
    { id: 'video', icon: 'fa-video', label: 'Видеозвонки', status: 'planned', color: 'text-red-400' },
    { id: 'donate', icon: 'fa-heart', label: 'Донаты', status: 'planned', color: 'text-pink-400' }
  ];
  
  return menuItems.map(item => `
    <button 
      onclick="switchView('${item.id}')"
      class="w-full flex items-center justify-between p-3 mb-1 rounded-lg hover:bg-telegram-hover transition ${
        app.currentView === item.id ? 'bg-telegram-active' : ''
      } ${item.active ? '' : 'opacity-75'}"
    >
      <div class="flex items-center">
        <i class="fas ${item.icon} ${item.color || 'text-telegram-accent'} w-5 mr-3"></i>
        <span class="text-sm">${item.label}</span>
      </div>
      ${item.badge ? `
        <span class="bg-telegram-accent text-xs px-2 py-1 rounded-full">${item.badge}</span>
      ` : ''}
      ${item.status === 'new' ? `
        <span class="text-xs bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-0.5 rounded animate-pulse">new</span>
      ` : ''}
      ${item.status === 'soon' ? `
        <span class="text-xs bg-yellow-500 bg-opacity-20 text-yellow-400 px-2 py-0.5 rounded">скоро</span>
      ` : ''}
      ${item.status === 'planned' ? `
        <span class="text-xs bg-gray-500 bg-opacity-20 text-gray-400 px-2 py-0.5 rounded">план</span>
      ` : ''}
    </button>
  `).join('');
}

// Render compact menu when collapsed
function renderCompactMenu() {
  const menuItems = [
    { id: 'chats', icon: 'fa-comments', active: true, color: 'text-telegram-accent' },
    { id: 'wallet', icon: 'fa-wallet', color: 'text-yellow-400' },
    { id: 'dating', icon: 'fa-heart-pulse', color: 'text-red-500', isNew: true },
    { id: 'lottery', icon: 'fa-dice', color: 'text-yellow-500', isNew: true },
    { id: 'travel', icon: 'fa-plane', color: 'text-blue-500', isNew: true },
    { id: 'rental', icon: 'fa-key', color: 'text-green-500', isNew: true },
    { id: 'events', icon: 'fa-calendar-star', color: 'text-purple-500', isNew: true }
  ];
  
  return `
    <div class="p-2">
      ${menuItems.map(item => `
        <button 
          onclick="switchView('${item.id}')"
          title="${item.id}"
          class="w-full p-3 mb-2 rounded-lg hover:bg-telegram-hover transition ${
            app.currentView === item.id ? 'bg-telegram-active' : ''
          } ${item.active ? '' : 'opacity-50'}"
        >
          <i class="fas ${item.icon} text-telegram-accent"></i>
        </button>
      `).join('')}
    </div>
  `;
}

// Switch between different views
function switchView(viewId) {
  app.currentView = viewId;
  
  // If view is not chats and not implemented yet, show coming soon
  if (viewId !== 'chats') {
    renderComingSoonView(viewId);
  } else {
    renderMainInterface();
  }
}

// Render sidebar content based on current view
function renderSidebarContent() {
  switch(app.currentView) {
    case 'chats':
      return renderChatListContent();
    case 'wallet':
      return renderWalletSidebar();
    case 'nft':
      return renderNFTSidebar();
    case 'marketplace':
      return renderMarketplaceSidebar();
    default:
      return renderChatListContent();
  }
}

// Render wallet sidebar preview
function renderWalletSidebar() {
  return `
    <div class="p-4">
      <div class="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-4 mb-4">
        <div class="text-white text-sm opacity-90">Общий баланс</div>
        <div class="text-white text-2xl font-bold">$0.00</div>
      </div>
      <div class="space-y-2">
        <div class="bg-telegram-bg rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                <span class="text-white text-xs font-bold">TON</span>
              </div>
              <div>
                <div class="text-sm">TON</div>
                <div class="text-xs text-telegram-secondary">0 TON</div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-telegram-bg rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center mr-2">
                <span class="text-white text-xs font-bold">ETH</span>
              </div>
              <div>
                <div class="text-sm">Ethereum</div>
                <div class="text-xs text-telegram-secondary">0 ETH</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render NFT sidebar preview
function renderNFTSidebar() {
  return `
    <div class="p-4">
      <h3 class="text-sm font-semibold mb-3">Топ коллекции</h3>
      <div class="space-y-2">
        <div class="bg-telegram-bg rounded-lg p-3">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg mr-3"></div>
            <div>
              <div class="text-sm font-semibold">CryptoKaif</div>
              <div class="text-xs text-telegram-secondary">Floor: 0.5 TON</div>
            </div>
          </div>
        </div>
        <div class="bg-telegram-bg rounded-lg p-3">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-green-400 rounded-lg mr-3"></div>
            <div>
              <div class="text-sm font-semibold">Lake Arts</div>
              <div class="text-xs text-telegram-secondary">Floor: 1.2 TON</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render marketplace sidebar preview  
function renderMarketplaceSidebar() {
  return `
    <div class="p-4">
      <h3 class="text-sm font-semibold mb-3">Категории</h3>
      <div class="space-y-1">
        <button class="w-full text-left p-2 rounded hover:bg-telegram-hover">
          <i class="fas fa-laptop mr-2 text-telegram-accent"></i> Электроника
        </button>
        <button class="w-full text-left p-2 rounded hover:bg-telegram-hover">
          <i class="fas fa-tshirt mr-2 text-telegram-accent"></i> Одежда
        </button>
        <button class="w-full text-left p-2 rounded hover:bg-telegram-hover">
          <i class="fas fa-book mr-2 text-telegram-accent"></i> Книги
        </button>
        <button class="w-full text-left p-2 rounded hover:bg-telegram-hover">
          <i class="fas fa-palette mr-2 text-telegram-accent"></i> Услуги
        </button>
      </div>
    </div>
  `;
}

function showSearchModal() {
  document.getElementById('search-modal').classList.remove('hidden');
}

function hideSearchModal() {
  document.getElementById('search-modal').classList.add('hidden');
}

function showError(message) {
  // Simple error display - you can enhance this
  alert(message);
}

// Render coming soon view for features in development
function renderComingSoonView(feature) {
  const features = {
    wallet: {
      title: 'Криптокошелек',
      icon: 'fa-wallet',
      color: 'from-yellow-400 to-orange-500',
      description: 'Управление криптовалютой прямо в мессенджере',
      features: [
        'Поддержка TON, BTC, ETH, USDT',
        'P2P переводы между пользователями',
        'Обмен криптовалют',
        'Интеграция с DeFi протоколами',
        'Стейкинг и farming'
      ],
      status: 'В разработке',
      progress: 15,
      demoAvailable: false
    },
    nft: {
      title: 'NFT Маркетплейс',
      icon: 'fa-image',
      color: 'from-purple-400 to-pink-500',
      description: 'Создавайте, покупайте и продавайте NFT',
      features: [
        'Минтинг NFT в один клик',
        'Торговая площадка',
        'Аукционы и торги',
        'Коллекции и галереи',
        'Интеграция с OpenSea'
      ],
      status: 'Планируется',
      progress: 5
    },
    marketplace: {
      title: 'Маркетплейс',
      icon: 'fa-shopping-cart',
      color: 'from-green-400 to-blue-500',
      description: 'Покупайте и продавайте товары и услуги',
      features: [
        'Физические и цифровые товары',
        'Безопасные сделки через escrow',
        'Рейтинги и отзывы',
        'Интеграция доставки',
        'Криптовалютные платежи'
      ],
      status: 'Планируется',
      progress: 10
    },
    crowdfunding: {
      title: 'Краудфандинг',
      icon: 'fa-hand-holding-usd',
      color: 'from-blue-400 to-indigo-500',
      description: 'Запускайте проекты и собирайте средства',
      features: [
        'Создание проектов',
        'Система наград для бекеров',
        'Прозрачное отслеживание средств',
        'Smart contract гарантии',
        'Возврат средств при неудаче'
      ],
      status: 'В планах',
      progress: 0
    },
    library: {
      title: 'Цифровая библиотека',
      icon: 'fa-book',
      color: 'from-indigo-400 to-purple-500',
      description: 'Книги, курсы и образовательный контент',
      features: [
        'Электронные книги',
        'Видеокурсы',
        '3D модели и дизайны',
        'Подписка на контент',
        'Авторские роялти'
      ],
      status: 'В планах',
      progress: 0
    },
    freelance: {
      title: 'Биржа труда',
      icon: 'fa-briefcase',
      color: 'from-orange-400 to-red-500',
      description: 'Находите специалистов и заказы',
      features: [
        'Профили фрилансеров',
        'Система заказов',
        'Безопасные сделки',
        'Портфолио и кейсы',
        'Умный подбор исполнителей'
      ],
      status: 'В планах',
      progress: 0
    },
    video: {
      title: 'Видеоконференции',
      icon: 'fa-video',
      color: 'from-red-400 to-pink-500',
      description: 'Групповые звонки и вебинары',
      features: [
        'Звонки до 50 участников',
        'Демонстрация экрана',
        'Запись конференций',
        'Виртуальные фоны',
        'Интеграция с календарем'
      ],
      status: 'В планах',
      progress: 0
    },
    donate: {
      title: 'Система донатов',
      icon: 'fa-heart',
      color: 'from-pink-400 to-red-500',
      description: 'Поддерживайте любимых авторов',
      features: [
        'Одноразовые донаты',
        'Месячные подписки',
        'Донат-алерты',
        'NFT награды',
        'Статистика и аналитика'
      ],
      status: 'В планах',
      progress: 0
    },
    dating: {
      title: '💕 КАЙФ-ЗНАКОМСТВА',
      icon: 'fa-heart-pulse',
      color: 'from-red-500 to-pink-600',
      description: 'Децентрализованная платформа знакомств с системой доверия и AI-матчингом',
      features: [
        '🤖 AI-powered алгоритм подбора пар на основе совместимости',
        '📹 Видео-профили и виртуальные свидания в приложении',
        '✅ Блокчейн-верификация личности через NFT',
        '🛡️ Trust Score система репутации пользователей',
        '🎮 Icebreakers игры и совместные активности',
        '🎁 NFT-подарки и виртуальные розы',
        '💎 Premium подписки с эксклюзивными функциями',
        '🎉 Офлайн события и speed-dating мероприятия'
      ],
      status: '🔥 Новый модуль - Архитектура готова',
      progress: 25,
      demoAvailable: true,
      demoLink: '/docs/architecture-examples/dating-feature.tsx'
    },
    lottery: {
      title: '🎰 КАЙФ-ЛОТЕРЕЯ',
      icon: 'fa-dice',
      color: 'from-yellow-500 to-orange-600',
      description: 'Децентрализованные лотереи и игры с доказуемой честностью на блокчейне',
      features: [
        '🎲 Смарт-контракты Solidity для прозрачных розыгрышей',
        '💰 Мега-джекпоты до 1,000,000 USDT',
        '🎯 Мгновенные игры: скретч-карты, колесо фортуны, слоты',
        '⚡ Автоматические выплаты призов через блокчейн',
        '🏆 NFT призы и эксклюзивные токены',
        '👥 Групповые лотереи и синдикаты',
        '📊 Provably Fair - доказуемая честность',
        '❤️ Благотворительные розыгрыши'
      ],
      status: '🎯 Новый модуль - Smart Contracts готовы',
      progress: 30,
      demoAvailable: true,
      demoLink: '/docs/architecture-examples/lottery-feature.tsx'
    },
    travel: {
      title: '🌍 КАЙФ-ПУТЕШЕСТВИЯ',
      icon: 'fa-plane',
      color: 'from-blue-500 to-cyan-600',
      description: 'Туристическая платформа с NFT-билетами и проверенными гидами',
      features: [
        '✈️ NFT-билеты на туры с защитой от подделок',
        '🏖️ Уникальные путешествия и локальные впечатления',
        '👨‍✈️ Проверенные гиды с Trust Score репутацией',
        '💎 Смарт-контракты для безопасных депозитов',
        '🏨 Бронирование отелей и апартаментов',
        '🎒 Групповые туры с крипто-сообществом',
        '📸 Travel NFT коллекции и сувениры',
        '🛡️ Страхование путешествий на блокчейне'
      ],
      status: '✈️ Новый модуль - Платформа спроектирована',
      progress: 20,
      demoAvailable: true,
      demoLink: '/docs/architecture-examples/travel-feature.tsx'
    },
    rental: {
      title: '🏠 КАЙФ-АРЕНДА',
      icon: 'fa-key',
      color: 'from-green-500 to-teal-600',
      description: 'P2P платформа аренды с блокчейн-депозитами и защитой сделок',
      features: [
        '🏠 Аренда недвижимости: квартиры, дома, виллы',
        '🚗 Премиум автомобили и электромобили',
        '📸 Профессиональное оборудование и техника',
        '🔐 Смарт-контракты для безопасных депозитов',
        '⚖️ Система разрешения споров с арбитражем',
        '⭐ Trust Score для арендаторов и владельцев',
        '💰 Мгновенные выплаты в криптовалюте',
        '📱 IoT интеграция для smart-доступа'
      ],
      status: '🔑 Новый модуль - Смарт-контракты готовы',
      progress: 28,
      demoAvailable: true,
      demoLink: '/docs/architecture-examples/rental-feature.tsx'
    },
    events: {
      title: '🎉 КАЙФ-СОБЫТИЯ',
      icon: 'fa-calendar-star',
      color: 'from-purple-500 to-indigo-600',
      description: 'Организация мероприятий с NFT-билетами и вторичным рынком',
      features: [
        '🎫 NFT-билеты с защитой от подделок',
        '💱 Вторичный рынок билетов с роялти организаторам',
        '🎵 Концерты, фестивали, конференции',
        '📺 Гибридные события с онлайн-трансляциями',
        '🔍 QR-коды для быстрого входа на мероприятия',
        '💎 VIP-пакеты и эксклюзивный контент',
        '📊 Аналитика и статистика для организаторов',
        '🏆 Gamification и награды для участников'
      ],
      status: '🎊 Новый модуль - Ticketing система готова',
      progress: 22,
      demoAvailable: true,
      demoLink: '/docs/architecture-examples/events-feature.tsx'
    }
  };
  
  const info = features[feature] || features.wallet;
  
  document.getElementById('app').innerHTML = `
    <div class="flex h-screen">
      <!-- Keep sidebar -->
      <div class="${app.menuOpen ? 'w-80' : 'w-16'} bg-telegram-sidebar border-r border-telegram-border flex flex-col transition-all duration-300">
        <!-- Header -->
        <div class="p-4 border-b border-telegram-border">
          <div class="flex items-center ${app.menuOpen ? 'justify-between' : 'justify-center'}">
            <button onclick="toggleMenu()" class="p-2 hover:bg-telegram-hover rounded" title="Меню">
              <i class="fas ${app.menuOpen ? 'fa-times' : 'fa-bars'} text-telegram-text"></i>
            </button>
            ${app.menuOpen ? `
              <h1 class="text-lg font-semibold">Кайф Озеро</h1>
              <button onclick="showSearchModal()" class="p-2 hover:bg-telegram-hover rounded">
                <i class="fas fa-search text-telegram-secondary"></i>
              </button>
            ` : ''}
          </div>
        </div>
        
        <!-- Ecosystem Menu -->
        <div class="${app.menuOpen ? 'block' : 'hidden'} border-b border-telegram-border">
          <nav class="p-2">
            ${renderEcosystemMenu()}
          </nav>
        </div>
        
        <!-- Content -->
        <div id="sidebar-content" class="flex-1 overflow-y-auto">
          ${app.menuOpen ? renderSidebarContent() : renderCompactMenu()}
        </div>
      </div>
      
      <!-- Main content - Coming Soon -->
      <div class="flex-1 overflow-y-auto bg-telegram-bg">
        <div class="max-w-4xl mx-auto p-8">
          <!-- Feature Header -->
          <div class="bg-gradient-to-br ${info.color} rounded-2xl p-8 mb-8 text-white">
            <div class="flex items-center mb-4">
              <div class="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                <i class="fas ${info.icon} text-3xl"></i>
              </div>
              <div>
                <h1 class="text-3xl font-bold">${info.title}</h1>
                <p class="text-white text-opacity-90">${info.description}</p>
              </div>
            </div>
            
            <!-- Progress bar -->
            <div class="mt-6">
              <div class="flex justify-between text-sm mb-2">
                <span>Прогресс разработки</span>
                <span>${info.progress}%</span>
              </div>
              <div class="w-full bg-white bg-opacity-20 rounded-full h-2">
                <div class="bg-white h-2 rounded-full transition-all" style="width: ${info.progress}%"></div>
              </div>
              <div class="mt-2 text-sm text-white text-opacity-90">
                Статус: <span class="font-semibold">${info.status}</span>
              </div>
            </div>
          </div>
          
          <!-- Demo Button for modules with architecture ready -->
          ${info.demoAvailable ? `
            <div class="mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl p-6 text-white">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-bold mb-2">🚀 Архитектура готова!</h3>
                  <p class="text-white/90">Детальная реализация модуля уже спроектирована и готова к разработке.</p>
                  <p class="text-sm text-white/70 mt-2">Включает: компоненты UI, смарт-контракты, блокчейн интеграцию, систему репутации</p>
                </div>
                <div class="text-center">
                  <div class="text-3xl mb-2">📱</div>
                  <button onclick="showArchitecturePreview('${feature}')" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-all">
                    Просмотр архитектуры
                  </button>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- Features Grid -->
          <div class="grid md:grid-cols-2 gap-4 mb-8">
            <div class="bg-telegram-sidebar rounded-xl p-6">
              <h3 class="text-lg font-semibold mb-4 text-telegram-accent">
                <i class="fas fa-star mr-2"></i>Планируемые функции
              </h3>
              <ul class="space-y-2">
                ${info.features.map(f => `
                  <li class="flex items-start">
                    <i class="fas fa-check-circle text-green-400 mt-1 mr-2"></i>
                    <span class="text-telegram-text">${f}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            
            <div class="bg-telegram-sidebar rounded-xl p-6">
              <h3 class="text-lg font-semibold mb-4 text-telegram-accent">
                <i class="fas fa-rocket mr-2"></i>Преимущества
              </h3>
              <div class="space-y-3">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-telegram-accent bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                    <i class="fas fa-shield-alt text-telegram-accent"></i>
                  </div>
                  <div>
                    <div class="font-semibold">Безопасность</div>
                    <div class="text-sm text-telegram-secondary">End-to-end шифрование</div>
                  </div>
                </div>
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-telegram-accent bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                    <i class="fas fa-bolt text-telegram-accent"></i>
                  </div>
                  <div>
                    <div class="font-semibold">Скорость</div>
                    <div class="text-sm text-telegram-secondary">Мгновенные транзакции</div>
                  </div>
                </div>
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-telegram-accent bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                    <i class="fas fa-users text-telegram-accent"></i>
                  </div>
                  <div>
                    <div class="font-semibold">Сообщество</div>
                    <div class="text-sm text-telegram-secondary">Интеграция с чатами</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Timeline -->
          <div class="bg-telegram-sidebar rounded-xl p-6 mb-8">
            <h3 class="text-lg font-semibold mb-4 text-telegram-accent">
              <i class="fas fa-calendar-alt mr-2"></i>Дорожная карта
            </h3>
            <div class="space-y-4">
              <div class="flex items-start">
                <div class="w-3 h-3 bg-green-400 rounded-full mt-1.5 mr-3"></div>
                <div>
                  <div class="font-semibold">Фаза 1: MVP</div>
                  <div class="text-sm text-telegram-secondary">Базовый мессенджер - Завершено ✓</div>
                </div>
              </div>
              <div class="flex items-start">
                <div class="w-3 h-3 bg-yellow-400 rounded-full mt-1.5 mr-3"></div>
                <div>
                  <div class="font-semibold">Фаза 2: Финансы</div>
                  <div class="text-sm text-telegram-secondary">Криптокошелек и платежи - Q1 2025</div>
                </div>
              </div>
              <div class="flex items-start">
                <div class="w-3 h-3 bg-gray-400 rounded-full mt-1.5 mr-3"></div>
                <div>
                  <div class="font-semibold">Фаза 3: Маркетплейс</div>
                  <div class="text-sm text-telegram-secondary">NFT и товары - Q2 2025</div>
                </div>
              </div>
              <div class="flex items-start">
                <div class="w-3 h-3 bg-gray-400 rounded-full mt-1.5 mr-3"></div>
                <div>
                  <div class="font-semibold">Фаза 4: Социальные функции</div>
                  <div class="text-sm text-telegram-secondary">Краудфандинг и донаты - Q3 2025</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Call to Action -->
          <div class="bg-gradient-to-r from-telegram-accent to-blue-600 rounded-xl p-6 text-center">
            <h3 class="text-xl font-bold text-white mb-2">Хотите ускорить разработку?</h3>
            <p class="text-white text-opacity-90 mb-4">
              Присоединяйтесь к нашей команде разработчиков или поддержите проект
            </p>
            <div class="flex justify-center space-x-4">
              <a href="https://github.com/kaiflake2023-a11y/-KAIF-lake" target="_blank" 
                class="bg-white text-telegram-accent px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition">
                <i class="fab fa-github mr-2"></i>GitHub
              </a>
              <button onclick="switchView('chats')" 
                class="bg-white bg-opacity-20 text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-30 transition">
                Вернуться к чатам
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Show architecture preview for new modules
function showArchitecturePreview(feature) {
  const architectures = {
    dating: {
      title: '💕 КАЙФ-ЗНАКОМСТВА - Архитектура',
      description: 'Децентрализованная платформа знакомств с AI-матчингом и блокчейн-верификацией',
      components: [
        '🤖 AI Matching Engine - Умный подбор пар на основе совместимости',
        '📹 Видео-профили и виртуальные свидания',
        '✅ NFT верификация личности',
        '🛡️ Trust Score система репутации',
        '🎁 NFT подарки и виртуальные розы',
        '💎 Premium подписки с эксклюзивными функциями'
      ]
    },
    lottery: {
      title: '🎰 КАЙФ-ЛОТЕРЕЯ - Архитектура',
      description: 'Блокчейн-лотереи с доказуемой честностью и мгновенными выплатами',
      components: [
        '📜 Смарт-контракты Solidity для прозрачных розыгрышей',
        '💰 Мега-джекпоты до 1,000,000 USDT',
        '🎯 Мгновенные игры: скретч-карты, колесо фортуны, слоты',
        '⚡ Автоматические выплаты призов',
        '🏆 NFT призы и эксклюзивные токены',
        '📊 Provably Fair система'
      ]
    },
    travel: {
      title: '🌍 КАЙФ-ПУТЕШЕСТВИЯ - Архитектура',
      description: 'Туристическая платформа с NFT-билетами и проверенными гидами',
      components: [
        '✈️ NFT-билеты на туры с защитой от подделок',
        '🏖️ Уникальные путешествия и локальные впечатления',
        '👨‍✈️ Проверенные гиды с Trust Score репутацией',
        '💎 Смарт-контракты для безопасных депозитов',
        '🏨 Бронирование отелей и апартаментов',
        '📸 Travel NFT коллекции и сувениры'
      ]
    },
    rental: {
      title: '🏠 КАЙФ-АРЕНДА - Архитектура',
      description: 'P2P платформа аренды с блокчейн-депозитами и защитой сделок',
      components: [
        '🏠 Аренда недвижимости: квартиры, дома, виллы',
        '🚗 Премиум автомобили и электромобили',
        '📸 Профессиональное оборудование и техника',
        '🔐 Смарт-контракты для безопасных депозитов',
        '⚖️ Система разрешения споров с арбитражем',
        '⭐ Trust Score для арендаторов и владельцев'
      ]
    },
    events: {
      title: '🎉 КАЙФ-СОБЫТИЯ - Архитектура',
      description: 'Организация мероприятий с NFT-билетами и вторичным рынком',
      components: [
        '🎫 NFT-билеты с защитой от подделок',
        '💱 Вторичный рынок билетов с роялти организаторам',
        '🎵 Концерты, фестивали, конференции',
        '📺 Гибридные события с онлайн-трансляциями',
        '🔍 QR-коды для быстрого входа',
        '💎 VIP-пакеты и эксклюзивный контент'
      ]
    }
  };

  const arch = architectures[feature];
  if (!arch) {
    showNotification('Архитектура для этого модуля еще не готова', 'warning');
    return;
  }

  // Create modal with architecture details
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
      <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">${arch.title}</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <p class="mt-2 text-white/90">${arch.description}</p>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-[60vh]">
        <div class="mb-6">
          <h3 class="text-lg font-bold mb-4 text-gray-800">
            <i class="fas fa-layer-group mr-2 text-blue-500"></i>
            Основные компоненты системы
          </h3>
          <div class="space-y-3">
            ${arch.components.map(comp => `
              <div class="flex items-start bg-gray-50 rounded-lg p-4">
                <div class="mr-3">
                  <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                </div>
                <p class="text-gray-700">${comp}</p>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-green-50 rounded-lg p-4">
            <div class="flex items-center mb-2">
              <i class="fas fa-check-circle text-green-500 mr-2"></i>
              <h4 class="font-semibold">Статус</h4>
            </div>
            <p class="text-sm text-gray-600">Архитектура спроектирована</p>
            <p class="text-xs text-gray-500 mt-1">Готово к разработке</p>
          </div>
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="flex items-center mb-2">
              <i class="fas fa-code text-blue-500 mr-2"></i>
              <h4 class="font-semibold">Технологии</h4>
            </div>
            <p class="text-sm text-gray-600">Web3.js, Solidity</p>
            <p class="text-xs text-gray-500 mt-1">Blockchain, NFT, Smart Contracts</p>
          </div>
        </div>
        
        <div class="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-purple-700">Файл архитектуры:</p>
              <code class="text-xs text-gray-600">/docs/architecture-examples/${feature}-feature.tsx</code>
            </div>
            <button onclick="showNotification('Архитектура сохранена в проекте', 'success')" 
                    class="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
              <i class="fas fa-download mr-2"></i>Посмотреть код
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', initializeApp);
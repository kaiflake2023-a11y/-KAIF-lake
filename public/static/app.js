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
  pollInterval: null
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
      <!-- Sidebar -->
      <div class="w-80 bg-telegram-sidebar border-r border-telegram-border flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-telegram-border">
          <div class="flex items-center justify-between mb-3">
            <button onclick="toggleMenu()" class="p-2 hover:bg-telegram-hover rounded">
              <i class="fas fa-bars text-telegram-secondary"></i>
            </button>
            <h1 class="text-lg font-semibold">Кайф Озеро</h1>
            <button onclick="showSearchModal()" class="p-2 hover:bg-telegram-hover rounded">
              <i class="fas fa-search text-telegram-secondary"></i>
            </button>
          </div>
          
          <!-- User menu (hidden by default) -->
          <div id="user-menu" class="hidden bg-telegram-bg rounded-lg p-3 mb-3">
            <div class="flex items-center mb-3">
              <div class="w-10 h-10 bg-telegram-accent rounded-full flex items-center justify-center mr-3">
                <i class="fas fa-user"></i>
              </div>
              <div>
                <div class="font-semibold">${app.user?.display_name || ''}</div>
                <div class="text-sm text-telegram-secondary">@${app.user?.username || ''}</div>
              </div>
            </div>
            <button onclick="logout()" class="w-full text-left py-2 px-3 hover:bg-telegram-hover rounded">
              <i class="fas fa-sign-out-alt mr-2"></i> Выйти
            </button>
          </div>
        </div>
        
        <!-- Chat list -->
        <div id="chat-list" class="flex-1 overflow-y-auto">
          ${renderChatListContent()}
        </div>
      </div>
      
      <!-- Main content -->
      <div class="flex-1 flex flex-col">
        ${app.currentChat ? renderChatView() : renderEmptyState()}
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
  const menu = document.getElementById('user-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
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

// Initialize app on load
document.addEventListener('DOMContentLoaded', initializeApp);
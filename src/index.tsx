import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { chatRoutes } from './routes/chats'
import { messageRoutes } from './routes/messages'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}))

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/manifest.json', serveStatic({ root: './public' }))
app.use('/sw.js', serveStatic({ root: './public' }))
app.use('/icons/*', serveStatic({ root: './public' }))

// API Routes
app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/chats', chatRoutes)
app.route('/api/messages', messageRoutes)

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'Kaif Lake Messenger' })
})

// Main SPA route
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>KAIF LAKE - Экосистема</title>
    <meta name="description" content="Децентрализованная экосистема: мессенджер, криптокошелек, NFT, маркетплейс и многое другое">
    <meta name="theme-color" content="#0088cc">
    
    <!-- PWA Meta Tags -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="KAIF LAKE">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <!-- Icons -->
    <link rel="icon" type="image/png" href="/icons/icon-192x192.png">
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
    
    <!-- Styles -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/logo-style.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
    
    <!-- Tailwind Config -->
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              telegram: {
                bg: '#0e1621',
                sidebar: '#17212b',
                active: '#2b5278',
                hover: '#202b36',
                accent: '#0088cc',
                text: '#ffffff',
                secondary: '#8b9398',
                input: '#242f3d',
                border: '#2f3a45'
              }
            }
          }
        }
      }
    </script>
</head>
<body class="bg-telegram-bg text-telegram-text">
    <div id="app" class="h-screen overflow-hidden">
        <!-- Loading Screen -->
        <div id="loading" class="flex items-center justify-center h-screen">
            <div class="text-center">
                <i class="fas fa-comment-dots text-6xl text-telegram-accent mb-4 animate-pulse"></i>
                <h1 class="text-2xl font-bold mb-2">Кайф Озеро</h1>
                <p class="text-telegram-secondary">Загрузка...</p>
            </div>
        </div>
    </div>
    
    <!-- External Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/locale/ru.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/relativeTime.js"></script>
    
    <!-- App Script -->
    <script src="/static/app.js" defer></script>
    
    <!-- Register Service Worker -->
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then((registration) => {
                console.log('Service Worker registered:', registration);
            }).catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
        }
    </script>
</body>
</html>`)
})

// Catch-all route for SPA navigation
app.get('*', (c) => c.redirect('/'))

export default app
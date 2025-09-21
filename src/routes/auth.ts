import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword, verifyPassword, createToken, generateId } from '../utils/auth'
import type { Env } from '../types'

const authRoutes = new Hono<{ Bindings: Env }>()

// Registration schema
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).max(100)
})

// Login schema
const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string()
}).refine(data => data.username || data.email, {
  message: 'Username or email is required'
})

// Register endpoint
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, email, password, display_name } = c.req.valid('json')
  
  try {
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first()
    
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409)
    }
    
    // Create new user
    const userId = generateId()
    const passwordHash = await hashPassword(password)
    
    await c.env.DB.prepare(
      `INSERT INTO users (id, username, email, password_hash, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(userId, username, email, passwordHash, display_name).run()
    
    // Get created user
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, created_at FROM users WHERE id = ?'
    ).bind(userId).first()
    
    // Create token
    const token = await createToken(user as any)
    
    // Create session
    const sessionId = generateId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    await c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(sessionId, userId, token, expiresAt).run()
    
    return c.json({ user, token })
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// Login endpoint
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, email, password } = c.req.valid('json')
  
  try {
    // Find user
    const user = await c.env.DB.prepare(
      `SELECT * FROM users WHERE ${username ? 'username' : 'email'} = ?`
    ).bind(username || email).first()
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash as string)
    
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    // Update last seen
    await c.env.DB.prepare(
      'UPDATE users SET is_online = true, last_seen = datetime("now") WHERE id = ?'
    ).bind(user.id).run()
    
    // Create token
    const token = await createToken(user as any)
    
    // Create session
    const sessionId = generateId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    await c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(sessionId, user.id as string, token, expiresAt).run()
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user as any
    
    return c.json({ user: userWithoutPassword, token })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Logout endpoint
authRoutes.post('/logout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 401)
  }
  
  try {
    // Delete session
    await c.env.DB.prepare(
      'DELETE FROM sessions WHERE token = ?'
    ).bind(token).run()
    
    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Logout failed' }, 500)
  }
})

export { authRoutes }
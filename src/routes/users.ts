import { Hono } from 'hono'
import { getUserFromToken } from '../utils/auth'
import type { Env } from '../types'

const userRoutes = new Hono<{ Bindings: Env }>()

// Middleware to check authentication
async function requireAuth(c: any, next: any) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  const user = await getUserFromToken(token, c.env)
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  c.set('user', user)
  await next()
}

// Get current user profile
userRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const { password_hash, ...userWithoutPassword } = user
  return c.json(userWithoutPassword)
})

// Update user profile
userRoutes.put('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  
  const allowedFields = ['display_name', 'bio', 'avatar_url']
  const updates: string[] = []
  const values: any[] = []
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(body[field])
    }
  }
  
  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400)
  }
  
  updates.push('updated_at = datetime("now")')
  values.push(user.id)
  
  try {
    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run()
    
    const updatedUser = await c.env.DB.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, is_online, last_seen, created_at FROM users WHERE id = ?'
    ).bind(user.id).first()
    
    return c.json(updatedUser)
  } catch (error) {
    console.error('Profile update error:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Search users
userRoutes.get('/search', requireAuth, async (c) => {
  const query = c.req.query('q')
  
  if (!query || query.length < 2) {
    return c.json({ error: 'Query must be at least 2 characters' }, 400)
  }
  
  try {
    const users = await c.env.DB.prepare(
      `SELECT id, username, display_name, avatar_url, bio, is_online, last_seen 
       FROM users 
       WHERE username LIKE ? OR display_name LIKE ?
       LIMIT 20`
    ).bind(`%${query}%`, `%${query}%`).all()
    
    return c.json(users.results)
  } catch (error) {
    console.error('User search error:', error)
    return c.json({ error: 'Search failed' }, 500)
  }
})

// Get user by ID
userRoutes.get('/:id', requireAuth, async (c) => {
  const userId = c.req.param('id')
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, display_name, avatar_url, bio, is_online, last_seen, created_at FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

// Get user's contacts
userRoutes.get('/me/contacts', requireAuth, async (c) => {
  const user = c.get('user')
  
  try {
    const contacts = await c.env.DB.prepare(
      `SELECT c.*, u.username, u.display_name, u.avatar_url, u.is_online, u.last_seen
       FROM contacts c
       JOIN users u ON c.contact_id = u.id
       WHERE c.user_id = ? AND c.is_blocked = false
       ORDER BY u.display_name`
    ).bind(user.id).all()
    
    return c.json(contacts.results)
  } catch (error) {
    console.error('Get contacts error:', error)
    return c.json({ error: 'Failed to get contacts' }, 500)
  }
})

// Add contact
userRoutes.post('/me/contacts', requireAuth, async (c) => {
  const user = c.get('user')
  const { contact_id, nickname } = await c.req.json()
  
  if (user.id === contact_id) {
    return c.json({ error: 'Cannot add yourself as contact' }, 400)
  }
  
  try {
    // Check if contact exists
    const contactUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(contact_id).first()
    
    if (!contactUser) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // Check if already in contacts
    const existing = await c.env.DB.prepare(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_id = ?'
    ).bind(user.id, contact_id).first()
    
    if (existing) {
      return c.json({ error: 'Contact already exists' }, 409)
    }
    
    // Add contact
    const contactId = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO contacts (id, user_id, contact_id, nickname, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(contactId, user.id, contact_id, nickname || null).run()
    
    return c.json({ id: contactId, message: 'Contact added' })
  } catch (error) {
    console.error('Add contact error:', error)
    return c.json({ error: 'Failed to add contact' }, 500)
  }
})

export { userRoutes }
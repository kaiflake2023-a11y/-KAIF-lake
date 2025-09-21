import { Hono } from 'hono'
import { getUserFromToken, generateId } from '../utils/auth'
import type { Env } from '../types'

const messageRoutes = new Hono<{ Bindings: Env }>()

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

// Get messages from chat
messageRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const chatId = c.req.query('chat_id')
  const limit = parseInt(c.req.query('limit') || '50')
  const before = c.req.query('before') // Message ID to get messages before
  
  if (!chatId) {
    return c.json({ error: 'chat_id is required' }, 400)
  }
  
  try {
    // Check if user is member
    const membership = await c.env.DB.prepare(
      'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?'
    ).bind(chatId, user.id).first()
    
    if (!membership) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    let query = `
      SELECT m.*, 
        u.username, u.display_name, u.avatar_url,
        r.id as reply_id, r.content as reply_content, r.sender_id as reply_sender_id,
        ru.display_name as reply_sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages r ON m.reply_to_id = r.id
      LEFT JOIN users ru ON r.sender_id = ru.id
      WHERE m.chat_id = ? AND m.is_deleted = false
    `
    
    const params = [chatId]
    
    if (before) {
      query += ' AND m.created_at < (SELECT created_at FROM messages WHERE id = ?)'
      params.push(before)
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ?'
    params.push(limit)
    
    const messages = await c.env.DB.prepare(query).bind(...params).all()
    
    // Get reactions for each message
    for (const message of messages.results as any[]) {
      const reactions = await c.env.DB.prepare(
        `SELECT r.*, u.username, u.display_name
         FROM message_reactions r
         JOIN users u ON r.user_id = u.id
         WHERE r.message_id = ?`
      ).bind(message.id).all()
      
      message.reactions = reactions.results
      
      // Format reply
      if (message.reply_id) {
        message.reply_to = {
          id: message.reply_id,
          content: message.reply_content,
          sender_name: message.reply_sender_name
        }
      }
    }
    
    // Reverse to get chronological order
    messages.results.reverse()
    
    return c.json(messages.results)
  } catch (error) {
    console.error('Get messages error:', error)
    return c.json({ error: 'Failed to get messages' }, 500)
  }
})

// Send message
messageRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const { chat_id, content, type = 'text', reply_to_id, media_url, media_metadata } = await c.req.json()
  
  if (!chat_id) {
    return c.json({ error: 'chat_id is required' }, 400)
  }
  
  if (!content && type === 'text') {
    return c.json({ error: 'Content is required for text messages' }, 400)
  }
  
  try {
    // Check if user is member
    const membership = await c.env.DB.prepare(
      'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?'
    ).bind(chat_id, user.id).first()
    
    if (!membership) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    // Create message
    const messageId = generateId()
    await c.env.DB.prepare(
      `INSERT INTO messages (
        id, chat_id, sender_id, content, type, media_url, media_metadata, reply_to_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      messageId,
      chat_id,
      user.id,
      content || null,
      type,
      media_url || null,
      media_metadata ? JSON.stringify(media_metadata) : null,
      reply_to_id || null
    ).run()
    
    // Update chat's updated_at
    await c.env.DB.prepare(
      'UPDATE chats SET updated_at = datetime("now") WHERE id = ?'
    ).bind(chat_id).run()
    
    // Get created message with user info
    const message = await c.env.DB.prepare(
      `SELECT m.*, u.username, u.display_name, u.avatar_url
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`
    ).bind(messageId).first()
    
    return c.json(message)
  } catch (error) {
    console.error('Send message error:', error)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// Edit message
messageRoutes.put('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const messageId = c.req.param('id')
  const { content } = await c.req.json()
  
  if (!content) {
    return c.json({ error: 'Content is required' }, 400)
  }
  
  try {
    // Check if user is sender
    const message = await c.env.DB.prepare(
      'SELECT * FROM messages WHERE id = ? AND sender_id = ?'
    ).bind(messageId, user.id).first()
    
    if (!message) {
      return c.json({ error: 'Message not found or access denied' }, 404)
    }
    
    // Update message
    await c.env.DB.prepare(
      `UPDATE messages 
       SET content = ?, is_edited = true, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(content, messageId).run()
    
    return c.json({ message: 'Message updated' })
  } catch (error) {
    console.error('Edit message error:', error)
    return c.json({ error: 'Failed to edit message' }, 500)
  }
})

// Delete message
messageRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const messageId = c.req.param('id')
  
  try {
    // Check if user is sender or admin
    const message = await c.env.DB.prepare(
      'SELECT m.*, cm.role FROM messages m JOIN chat_members cm ON m.chat_id = cm.chat_id WHERE m.id = ? AND cm.user_id = ?'
    ).bind(messageId, user.id).first()
    
    if (!message) {
      return c.json({ error: 'Message not found' }, 404)
    }
    
    if (message.sender_id !== user.id && message.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    // Soft delete
    await c.env.DB.prepare(
      'UPDATE messages SET is_deleted = true, updated_at = datetime("now") WHERE id = ?'
    ).bind(messageId).run()
    
    return c.json({ message: 'Message deleted' })
  } catch (error) {
    console.error('Delete message error:', error)
    return c.json({ error: 'Failed to delete message' }, 500)
  }
})

// Add reaction
messageRoutes.post('/:id/reactions', requireAuth, async (c) => {
  const user = c.get('user')
  const messageId = c.req.param('id')
  const { emoji } = await c.req.json()
  
  if (!emoji) {
    return c.json({ error: 'Emoji is required' }, 400)
  }
  
  try {
    // Check if message exists
    const message = await c.env.DB.prepare(
      'SELECT * FROM messages WHERE id = ?'
    ).bind(messageId).first()
    
    if (!message) {
      return c.json({ error: 'Message not found' }, 404)
    }
    
    // Check if reaction already exists
    const existing = await c.env.DB.prepare(
      'SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
    ).bind(messageId, user.id, emoji).first()
    
    if (existing) {
      // Remove reaction
      await c.env.DB.prepare(
        'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
      ).bind(messageId, user.id, emoji).run()
      
      return c.json({ message: 'Reaction removed' })
    } else {
      // Add reaction
      const reactionId = generateId()
      await c.env.DB.prepare(
        `INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(reactionId, messageId, user.id, emoji).run()
      
      return c.json({ message: 'Reaction added' })
    }
  } catch (error) {
    console.error('Reaction error:', error)
    return c.json({ error: 'Failed to toggle reaction' }, 500)
  }
})

export { messageRoutes }
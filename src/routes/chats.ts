import { Hono } from 'hono'
import { getUserFromToken, generateId } from '../utils/auth'
import type { Env, Chat } from '../types'

const chatRoutes = new Hono<{ Bindings: Env }>()

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

// Get user's chats
chatRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  
  try {
    const chats = await c.env.DB.prepare(
      `SELECT 
        c.*,
        cm.last_read_message_id,
        cm.is_muted,
        (SELECT COUNT(*) FROM messages m 
         WHERE m.chat_id = c.id 
         AND m.id > COALESCE(cm.last_read_message_id, '') 
         AND m.sender_id != ?) as unread_count
       FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = ?
       ORDER BY c.updated_at DESC`
    ).bind(user.id, user.id).all()
    
    // Get last message for each chat
    for (const chat of chats.results as any[]) {
      const lastMessage = await c.env.DB.prepare(
        `SELECT m.*, u.username, u.display_name, u.avatar_url
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.chat_id = ? AND m.is_deleted = false
         ORDER BY m.created_at DESC
         LIMIT 1`
      ).bind(chat.id).first()
      
      if (lastMessage) {
        chat.last_message = lastMessage
      }
      
      // For direct chats, get the other user's info
      if (chat.type === 'direct') {
        const otherUser = await c.env.DB.prepare(
          `SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_online, u.last_seen
           FROM chat_members cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.chat_id = ? AND cm.user_id != ?
           LIMIT 1`
        ).bind(chat.id, user.id).first()
        
        if (otherUser) {
          chat.name = otherUser.display_name
          chat.avatar_url = otherUser.avatar_url
          chat.other_user = otherUser
        }
      }
    }
    
    return c.json(chats.results)
  } catch (error) {
    console.error('Get chats error:', error)
    return c.json({ error: 'Failed to get chats' }, 500)
  }
})

// Create new chat
chatRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const { type, name, description, member_ids } = await c.req.json()
  
  if (!type || !['direct', 'group', 'channel'].includes(type)) {
    return c.json({ error: 'Invalid chat type' }, 400)
  }
  
  if (type === 'direct' && (!member_ids || member_ids.length !== 1)) {
    return c.json({ error: 'Direct chat requires exactly one other member' }, 400)
  }
  
  if ((type === 'group' || type === 'channel') && !name) {
    return c.json({ error: 'Group and channel chats require a name' }, 400)
  }
  
  try {
    // For direct chat, check if it already exists
    if (type === 'direct') {
      const existingChat = await c.env.DB.prepare(
        `SELECT c.id FROM chats c
         JOIN chat_members cm1 ON c.id = cm1.chat_id
         JOIN chat_members cm2 ON c.id = cm2.chat_id
         WHERE c.type = 'direct'
         AND cm1.user_id = ? AND cm2.user_id = ?`
      ).bind(user.id, member_ids[0]).first()
      
      if (existingChat) {
        return c.json({ id: existingChat.id, message: 'Chat already exists' })
      }
    }
    
    // Create chat
    const chatId = generateId()
    await c.env.DB.prepare(
      `INSERT INTO chats (id, type, name, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(chatId, type, name || null, description || null, user.id).run()
    
    // Add creator as admin
    const creatorMemberId = generateId()
    await c.env.DB.prepare(
      `INSERT INTO chat_members (id, chat_id, user_id, role, joined_at)
       VALUES (?, ?, ?, 'admin', datetime('now'))`
    ).bind(creatorMemberId, chatId, user.id).run()
    
    // Add other members
    if (member_ids && member_ids.length > 0) {
      for (const memberId of member_ids) {
        const memberRecordId = generateId()
        await c.env.DB.prepare(
          `INSERT INTO chat_members (id, chat_id, user_id, role, joined_at)
           VALUES (?, ?, ?, 'member', datetime('now'))`
        ).bind(memberRecordId, chatId, memberId).run()
      }
    }
    
    // Add system message
    const systemMessageId = generateId()
    await c.env.DB.prepare(
      `INSERT INTO messages (id, chat_id, sender_id, content, type, created_at)
       VALUES (?, ?, ?, ?, 'system', datetime('now'))`
    ).bind(
      systemMessageId, 
      chatId, 
      user.id,
      type === 'direct' ? 'Chat started' : `${user.display_name} created the ${type}`
    ).run()
    
    return c.json({ id: chatId, message: 'Chat created successfully' })
  } catch (error) {
    console.error('Create chat error:', error)
    return c.json({ error: 'Failed to create chat' }, 500)
  }
})

// Get chat details
chatRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const chatId = c.req.param('id')
  
  try {
    // Check if user is member
    const membership = await c.env.DB.prepare(
      'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?'
    ).bind(chatId, user.id).first()
    
    if (!membership) {
      return c.json({ error: 'Chat not found or access denied' }, 404)
    }
    
    // Get chat details
    const chat = await c.env.DB.prepare(
      'SELECT * FROM chats WHERE id = ?'
    ).bind(chatId).first()
    
    if (!chat) {
      return c.json({ error: 'Chat not found' }, 404)
    }
    
    // Get members
    const members = await c.env.DB.prepare(
      `SELECT cm.*, u.username, u.display_name, u.avatar_url, u.is_online, u.last_seen
       FROM chat_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.chat_id = ?`
    ).bind(chatId).all()
    
    const chatWithMembers = {
      ...chat,
      members: members.results,
      user_role: membership.role
    }
    
    return c.json(chatWithMembers)
  } catch (error) {
    console.error('Get chat error:', error)
    return c.json({ error: 'Failed to get chat' }, 500)
  }
})

// Mark chat as read
chatRoutes.post('/:id/read', requireAuth, async (c) => {
  const user = c.get('user')
  const chatId = c.req.param('id')
  const { message_id } = await c.req.json()
  
  try {
    await c.env.DB.prepare(
      `UPDATE chat_members 
       SET last_read_message_id = ?
       WHERE chat_id = ? AND user_id = ?`
    ).bind(message_id, chatId, user.id).run()
    
    return c.json({ message: 'Marked as read' })
  } catch (error) {
    console.error('Mark read error:', error)
    return c.json({ error: 'Failed to mark as read' }, 500)
  }
})

export { chatRoutes }
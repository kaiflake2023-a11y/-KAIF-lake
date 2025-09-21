export interface Env {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  JWT_SECRET?: string
  ENVIRONMENT?: string
}

export interface User {
  id: string
  username: string
  email: string
  password_hash?: string
  display_name: string
  avatar_url?: string
  bio?: string
  is_online?: boolean
  last_seen?: string
  created_at?: string
  updated_at?: string
}

export interface Chat {
  id: string
  type: 'direct' | 'group' | 'channel'
  name?: string
  description?: string
  avatar_url?: string
  created_by: string
  created_at?: string
  updated_at?: string
  last_message?: Message
  unread_count?: number
  members?: ChatMember[]
}

export interface ChatMember {
  id: string
  chat_id: string
  user_id: string
  user?: User
  role: 'admin' | 'member'
  joined_at?: string
  last_read_message_id?: string
  is_muted?: boolean
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  sender?: User
  content?: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
  media_url?: string
  media_metadata?: any
  reply_to_id?: string
  reply_to?: Message
  is_edited?: boolean
  is_deleted?: boolean
  reactions?: MessageReaction[]
  created_at?: string
  updated_at?: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  user?: User
  emoji: string
  created_at?: string
}

export interface Session {
  id: string
  user_id: string
  token: string
  device_info?: string
  ip_address?: string
  expires_at: string
  created_at?: string
}

export interface Contact {
  id: string
  user_id: string
  contact_id: string
  contact?: User
  nickname?: string
  is_blocked?: boolean
  created_at?: string
}
-- Seed data for testing
-- Create test users
INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, bio, created_at) VALUES 
  ('user1', 'alice', 'alice@example.com', '$2a$10$YourHashHere', 'Alice Johnson', 'Love to chat!', datetime('now')),
  ('user2', 'bob', 'bob@example.com', '$2a$10$YourHashHere', 'Bob Smith', 'Hello world!', datetime('now')),
  ('user3', 'charlie', 'charlie@example.com', '$2a$10$YourHashHere', 'Charlie Brown', 'Nice to meet you', datetime('now'));

-- Create test chats
INSERT OR IGNORE INTO chats (id, type, name, description, created_by, created_at) VALUES 
  ('chat1', 'direct', NULL, NULL, 'user1', datetime('now')),
  ('chat2', 'group', 'General Discussion', 'A place to chat about everything', 'user1', datetime('now')),
  ('chat3', 'channel', 'Announcements', 'Official announcements', 'user1', datetime('now'));

-- Add members to chats
INSERT OR IGNORE INTO chat_members (id, chat_id, user_id, role, joined_at) VALUES 
  ('cm1', 'chat1', 'user1', 'member', datetime('now')),
  ('cm2', 'chat1', 'user2', 'member', datetime('now')),
  ('cm3', 'chat2', 'user1', 'admin', datetime('now')),
  ('cm4', 'chat2', 'user2', 'member', datetime('now')),
  ('cm5', 'chat2', 'user3', 'member', datetime('now')),
  ('cm6', 'chat3', 'user1', 'admin', datetime('now'));

-- Add test messages
INSERT OR IGNORE INTO messages (id, chat_id, sender_id, content, type, created_at) VALUES 
  ('msg1', 'chat1', 'user1', 'Hey Bob, how are you?', 'text', datetime('now', '-5 minutes')),
  ('msg2', 'chat1', 'user2', 'Hi Alice! I am doing great, thanks!', 'text', datetime('now', '-4 minutes')),
  ('msg3', 'chat2', 'user1', 'Welcome everyone to the group!', 'text', datetime('now', '-3 minutes')),
  ('msg4', 'chat2', 'user2', 'Thanks for adding me!', 'text', datetime('now', '-2 minutes')),
  ('msg5', 'chat2', 'user3', 'Happy to be here!', 'text', datetime('now', '-1 minute'));
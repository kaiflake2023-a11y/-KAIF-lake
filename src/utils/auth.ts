import { SignJWT, jwtVerify } from 'jose'
import * as bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import type { Env, User } from '../types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'kaif-lake-secret-key-change-in-production'
)

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({ 
    id: user.id,
    username: user.username,
    email: user.email
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
  
  return token
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function getUserFromToken(token: string, env: Env): Promise<User | null> {
  try {
    const payload = await verifyToken(token)
    
    const result = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(payload.id).first()
    
    return result as User | null
  } catch (error) {
    return null
  }
}

export function generateId(): string {
  return nanoid()
}
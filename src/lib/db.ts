import Database from 'better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

// Initialize database in the project root
const dbPath = path.join(process.cwd(), 'data.db')
const db = new Database(dbPath)

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    name TEXT,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export interface User {
  id: string
  email: string
  password: string | null
  name: string | null
  image: string | null
  created_at: string
  updated_at: string
}

// Generate a simple unique ID
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 10)
  const id = generateId()

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password, name)
    VALUES (?, ?, ?, ?)
  `)

  stmt.run(id, email.toLowerCase(), hashedPassword, name || null)

  return getUserByEmail(email)!
}

export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?')
  return stmt.get(email.toLowerCase()) as User | null
}

export function getUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(id) as User | null
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export { db }

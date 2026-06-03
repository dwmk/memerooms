import { Pool } from 'pg'

// Create a connection pool - will gracefully handle missing DATABASE_URL
let pool: Pool | null = null

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  
  return pool
}

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL
}

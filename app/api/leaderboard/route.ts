import { NextRequest, NextResponse } from 'next/server'
import { getPool, isDatabaseAvailable } from '@/lib/db'

// Country code to emoji mapping
const countryEmojis: Record<string, string> = {
  'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺', 'DE': '🇩🇪',
  'FR': '🇫🇷', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
  'BR': '🇧🇷', 'MX': '🇲🇽', 'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱',
  'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱',
  'RU': '🇷🇺', 'UA': '🇺🇦', 'TR': '🇹🇷', 'ID': '🇮🇩', 'TH': '🇹🇭',
  'VN': '🇻🇳', 'PH': '🇵🇭', 'MY': '🇲🇾', 'SG': '🇸🇬', 'NZ': '🇳🇿',
  'ZA': '🇿🇦', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
  'BD': '🇧🇩', 'PK': '🇵🇰', 'EG': '🇪🇬', 'SA': '🇸🇦', 'AE': '🇦🇪',
  'IL': '🇮🇱', 'NG': '🇳🇬', 'KE': '🇰🇪', 'GH': '🇬🇭', 'AT': '🇦🇹',
  'BE': '🇧🇪', 'CH': '🇨🇭', 'CZ': '🇨🇿', 'GR': '🇬🇷', 'HU': '🇭🇺',
  'IE': '🇮🇪', 'PT': '🇵🇹', 'RO': '🇷🇴', 'XX': '🏳️'
}

function getCountryEmoji(code: string): string {
  return countryEmojis[code.toUpperCase()] || '🏳️'
}

export interface LeaderboardEntry {
  id: number
  username: string
  discriminator: string
  score: number
  countryCode: string
  countryEmoji: string
  gameMode: string
  createdAt: string
  rank?: number
}

// GET - Fetch leaderboard
export async function GET(request: NextRequest) {
  if (!isDatabaseAvailable()) {
    return NextResponse.json({ 
      available: false, 
      message: 'Leaderboard rankings unavailable right now' 
    })
  }

  const pool = getPool()
  if (!pool) {
    return NextResponse.json({ 
      available: false, 
      message: 'Leaderboard rankings unavailable right now' 
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'global'
    const countryCode = searchParams.get('country') || 'XX'
    const playerUsername = searchParams.get('username')
    const playerDiscriminator = searchParams.get('discriminator')

    let leaderboardQuery: string
    let leaderboardParams: (string | number)[]

    if (tab === 'country' && countryCode !== 'XX') {
      // Country-specific leaderboard
      leaderboardQuery = `
        SELECT id, username, discriminator, score, country_code, country_emoji, game_mode, created_at
        FROM leaderboard_scores
        WHERE country_code = $1
        ORDER BY score DESC
        LIMIT 100
      `
      leaderboardParams = [countryCode]
    } else {
      // Global leaderboard
      leaderboardQuery = `
        SELECT id, username, discriminator, score, country_code, country_emoji, game_mode, created_at
        FROM leaderboard_scores
        ORDER BY score DESC
        LIMIT 100
      `
      leaderboardParams = []
    }

    const leaderboardResult = await pool.query(leaderboardQuery, leaderboardParams)
    
    const entries: LeaderboardEntry[] = leaderboardResult.rows.map((row, index) => ({
      id: row.id,
      username: row.username,
      discriminator: row.discriminator,
      score: row.score,
      countryCode: row.country_code,
      countryEmoji: row.country_emoji,
      gameMode: row.game_mode,
      createdAt: row.created_at,
      rank: index + 1
    }))

    // Get player's own rank if they have submitted scores
    let playerRank: number | null = null
    let playerEntry: LeaderboardEntry | null = null

    if (playerUsername && playerDiscriminator) {
      const rankQuery = tab === 'country' && countryCode !== 'XX'
        ? `
          SELECT rank FROM (
            SELECT id, username, discriminator, RANK() OVER (ORDER BY score DESC) as rank
            FROM leaderboard_scores
            WHERE country_code = $3
          ) ranked
          WHERE username = $1 AND discriminator = $2
          LIMIT 1
        `
        : `
          SELECT rank FROM (
            SELECT id, username, discriminator, RANK() OVER (ORDER BY score DESC) as rank
            FROM leaderboard_scores
          ) ranked
          WHERE username = $1 AND discriminator = $2
          LIMIT 1
        `
      
      const rankParams = tab === 'country' && countryCode !== 'XX'
        ? [playerUsername, playerDiscriminator, countryCode]
        : [playerUsername, playerDiscriminator]

      const rankResult = await pool.query(rankQuery, rankParams)
      
      if (rankResult.rows.length > 0) {
        playerRank = parseInt(rankResult.rows[0].rank)
        
        // Also get player's best score entry
        const playerQuery = `
          SELECT id, username, discriminator, score, country_code, country_emoji, game_mode, created_at
          FROM leaderboard_scores
          WHERE username = $1 AND discriminator = $2
          ORDER BY score DESC
          LIMIT 1
        `
        const playerResult = await pool.query(playerQuery, [playerUsername, playerDiscriminator])
        
        if (playerResult.rows.length > 0) {
          const row = playerResult.rows[0]
          playerEntry = {
            id: row.id,
            username: row.username,
            discriminator: row.discriminator,
            score: row.score,
            countryCode: row.country_code,
            countryEmoji: row.country_emoji,
            gameMode: row.game_mode,
            createdAt: row.created_at,
            rank: playerRank
          }
        }
      }
    }

    return NextResponse.json({
      available: true,
      entries,
      playerRank: playerRank ? (playerRank > 999 ? '999+' : playerRank) : null,
      playerEntry
    })
  } catch (error) {
    console.error('Leaderboard GET error:', error)
    return NextResponse.json({ 
      available: false, 
      message: 'Leaderboard rankings unavailable right now' 
    })
  }
}

// POST - Submit score
export async function POST(request: NextRequest) {
  if (!isDatabaseAvailable()) {
    return NextResponse.json({ 
      success: false, 
      message: 'Score submission unavailable' 
    }, { status: 503 })
  }

  const pool = getPool()
  if (!pool) {
    return NextResponse.json({ 
      success: false, 
      message: 'Score submission unavailable' 
    }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { username, discriminator, score, gameMode } = body

    // Validate input
    if (!username || typeof username !== 'string' || username.length > 16) {
      return NextResponse.json({ success: false, message: 'Invalid username' }, { status: 400 })
    }
    if (!discriminator || typeof discriminator !== 'string' || !/^\d{4}$/.test(discriminator)) {
      return NextResponse.json({ success: false, message: 'Invalid discriminator' }, { status: 400 })
    }
    if (typeof score !== 'number' || score < 0 || score > 999999999) {
      return NextResponse.json({ success: false, message: 'Invalid score' }, { status: 400 })
    }
    if (!['horror', 'aura', 'goofy'].includes(gameMode)) {
      return NextResponse.json({ success: false, message: 'Invalid game mode' }, { status: 400 })
    }

    // Get country from Vercel's geo header or fallback
    const countryCode = request.headers.get('x-vercel-ip-country') || 'XX'
    const countryEmoji = getCountryEmoji(countryCode)

    // Insert the score
    const insertQuery = `
      INSERT INTO leaderboard_scores (username, discriminator, score, country_code, country_emoji, game_mode)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `
    const result = await pool.query(insertQuery, [
      username, discriminator, score, countryCode, countryEmoji, gameMode
    ])

    // Get the new rank
    const rankQuery = `
      SELECT rank FROM (
        SELECT id, RANK() OVER (ORDER BY score DESC) as rank
        FROM leaderboard_scores
      ) ranked
      WHERE id = $1
    `
    const rankResult = await pool.query(rankQuery, [result.rows[0].id])
    const rank = parseInt(rankResult.rows[0].rank)

    return NextResponse.json({
      success: true,
      rank: rank > 999 ? '999+' : rank,
      countryCode,
      countryEmoji
    })
  } catch (error) {
    console.error('Leaderboard POST error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Score submission failed' 
    }, { status: 500 })
  }
}

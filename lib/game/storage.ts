import { GameStats, DEFAULT_GAME_STATS, GameMode } from './types'

const STORAGE_KEY = 'memerooms_stats'

export function loadStats(): GameStats {
  if (typeof window === 'undefined') return DEFAULT_GAME_STATS
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as GameStats
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
  return { ...DEFAULT_GAME_STATS }
}

export function saveStats(stats: GameStats): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch (e) {
    console.error('Failed to save stats:', e)
  }
}

export function incrementGamesStarted(): GameStats {
  const stats = loadStats()
  stats.totalGamesStarted += 1
  saveStats(stats)
  return stats
}

export function addPlayTime(minutes: number): GameStats {
  const stats = loadStats()
  stats.totalMinutesPlayed += minutes
  saveStats(stats)
  return stats
}

export function addHighScore(score: number, mode: GameMode): GameStats {
  const stats = loadStats()
  
  stats.highScores.push({
    score,
    timestamp: new Date().toLocaleString(),
    mode
  })
  
  // Keep only top 3 scores
  stats.highScores.sort((a, b) => b.score - a.score)
  stats.highScores = stats.highScores.slice(0, 3)
  
  saveStats(stats)
  return stats
}

export function formatPlayTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

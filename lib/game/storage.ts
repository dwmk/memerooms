import { GameStats, DEFAULT_GAME_STATS, GameMode, PlayerIdentity, CustomEntitySettings, DEFAULT_CUSTOM_ENTITY_SETTINGS } from './types'

const STORAGE_KEY = 'memerooms_stats'
const PLAYER_KEY = 'memerooms_player'
const CUSTOM_SETTINGS_KEY = 'memerooms_custom_settings'
const CUSTOM_TEXTURES_KEY = 'memerooms_custom_textures'

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

// Player identity functions
export function loadPlayer(): PlayerIdentity | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(PLAYER_KEY)
    if (stored) {
      return JSON.parse(stored) as PlayerIdentity
    }
  } catch (e) {
    console.error('Failed to load player:', e)
  }
  return null
}

export function savePlayer(player: PlayerIdentity): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(player))
  } catch (e) {
    console.error('Failed to save player:', e)
  }
}

export function generateDiscriminator(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// Custom entity settings functions
export function loadCustomSettings(): CustomEntitySettings {
  if (typeof window === 'undefined') return { ...DEFAULT_CUSTOM_ENTITY_SETTINGS }
  
  try {
    const stored = localStorage.getItem(CUSTOM_SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored) as CustomEntitySettings
    }
  } catch (e) {
    console.error('Failed to load custom settings:', e)
  }
  return { ...DEFAULT_CUSTOM_ENTITY_SETTINGS }
}

export function saveCustomSettings(settings: CustomEntitySettings): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CUSTOM_SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save custom settings:', e)
  }
}

// Custom textures functions
export function loadCustomTextures(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(CUSTOM_TEXTURES_KEY)
    if (stored) {
      return JSON.parse(stored) as string[]
    }
  } catch (e) {
    console.error('Failed to load custom textures:', e)
  }
  return []
}

export function saveCustomTextures(textures: string[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CUSTOM_TEXTURES_KEY, JSON.stringify(textures))
  } catch (e) {
    console.error('Failed to save custom textures:', e)
  }
}

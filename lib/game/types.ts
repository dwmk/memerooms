export type GameMode = 'horror' | 'aura' | 'goofy'

export interface GameModeConfig {
  name: string
  icon: string
  fogColor: number
  fogNear: number
  fogFar: number
  ambientLight: number
  floorColor: number
  wallColor: number
  ceilingColor: number
  lightColor: number
  lightIntensity: number
  lightFlicker: boolean
  entitySpeed: number
  entityDetectionRange: number
  entityBehavior: 'creeping' | 'steady' | 'chaotic'
  fontFamily: string
  uiPrimaryColor: string
  uiSecondaryColor: string
  uiAccentColor: string
  healthBarColor: string
  defaultAudio: string
}

export interface PlayerState {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  rotation: { x: number; y: number }
  health: number
  isGrounded: boolean
  isBhopping: boolean
  bhopMultiplier: number
}

export interface EntityState {
  id: string
  position: { x: number; y: number; z: number }
  targetPosition: { x: number; y: number; z: number }
  isChasing: boolean
  scale: number
  tiltAngle: number
  textureUrl: string
  lastSeenPlayerPos: { x: number; z: number } | null
  lostTrackTime: number
  predictionOffset: { x: number; z: number }
}

export interface GameStats {
  totalMinutesPlayed: number
  totalGamesStarted: number
  highScores: Array<{
    score: number
    timestamp: string
    mode: GameMode
  }>
}

// Player identity for leaderboard (anonymous, stored in localStorage)
export interface PlayerIdentity {
  username: string
  discriminator: string // 4-digit number as string, e.g. "1234"
}

// Custom entity settings for the Customize modal
export interface CustomEntitySettings {
  speed: number // 3-15
  detectionRange: number // 10-80
  behavior: 'creeping' | 'steady' | 'chaotic'
}

export const DEFAULT_CUSTOM_ENTITY_SETTINGS: CustomEntitySettings = {
  speed: 8,
  detectionRange: 40,
  behavior: 'steady'
}

export interface GameState {
  mode: GameMode
  isPlaying: boolean
  isPaused: boolean
  score: number
  player: PlayerState
  entities: EntityState[]
  customEntityTextures: string[]
  youtubeUrl: string | null
}

// Classic backrooms colors - authentic yellow wallpaper, tan carpet, cream ceiling
export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  horror: {
    name: 'Horror Mode',
    icon: '💀',
    // Much brighter fog settings for visibility
    fogColor: 0x8B8B6B,
    fogNear: 15,
    fogFar: 50,
    ambientLight: 0.6,
    // Classic backrooms palette
    floorColor: 0x8B7355,    // Tan carpet
    wallColor: 0xC4A946,     // Yellow wallpaper  
    ceilingColor: 0xE8E4D4,  // Off-white ceiling panels
    lightColor: 0xFFF8DC,    // Warm fluorescent
    lightIntensity: 2.5,     // Brighter lights
    lightFlicker: true,
    entitySpeed: 9,
    entityDetectionRange: 50,
    entityBehavior: 'chaotic',
    fontFamily: 'var(--font-creepster)',
    uiPrimaryColor: '#1a0a0a',
    uiSecondaryColor: '#2d1f1f',
    uiAccentColor: '#8B0000',
    healthBarColor: '#8B0000',
    defaultAudio: '/audio/horror_ambient.mp3'
  },
  aura: {
    name: 'Aura Mode',
    icon: '🌙',
    // Brighter fog for Aura mode
    fogColor: 0x1a1a3a,
    fogNear: 20,
    fogFar: 90,
    ambientLight: 0.7,
    // Dark blue/purple cyberpunk palette
    floorColor: 0x1a1a2e,
    wallColor: 0x2a2a4e,
    ceilingColor: 0x1f1f3f,
    lightColor: 0x00FFFF,
    lightIntensity: 3.0,
    lightFlicker: false,
    entitySpeed: 8,
    entityDetectionRange: 40,
    entityBehavior: 'steady',
    fontFamily: 'var(--font-orbitron)',
    uiPrimaryColor: '#0a0a1a',
    uiSecondaryColor: '#16213e',
    uiAccentColor: '#00FFFF',
    healthBarColor: '#00FFFF',
    defaultAudio: '/audio/phonk_drive.mp3'
  },
  goofy: {
    name: 'Goofy Mode',
    icon: '🪩',
    // Very light fog - goofy mode is bright and chaotic
    fogColor: 0x4a3a5a,
    fogNear: 30,
    fogFar: 120,
    ambientLight: 1.0,
    // Bright chaotic colors
    floorColor: 0xFF69B4,
    wallColor: 0x7FFF00,
    ceilingColor: 0xFFFF00,
    lightColor: 0xFF00FF,
    lightIntensity: 3.5,
    lightFlicker: false,
    entitySpeed: 6,
    entityDetectionRange: 15,
    entityBehavior: 'creeping',
    fontFamily: 'var(--font-bangers)',
    uiPrimaryColor: '#1a0a2a',
    uiSecondaryColor: '#2a1a3a',
    uiAccentColor: '#FF00FF',
    healthBarColor: '#00FF00',
    defaultAudio: '/audio/goofy_meme.mp3'
  }
}

export const DEFAULT_PLAYER_STATE: PlayerState = {
  position: { x: 0, y: 1.8, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0 },
  health: 100,
  isGrounded: true,
  isBhopping: false,
  bhopMultiplier: 1
}

export const DEFAULT_GAME_STATS: GameStats = {
  totalMinutesPlayed: 0,
  totalGamesStarted: 0,
  highScores: []
}

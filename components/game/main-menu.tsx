'use client'

import { useState, useEffect } from 'react'
import { GameMode, GAME_MODE_CONFIGS, GameStats, DEFAULT_GAME_STATS, CustomEntitySettings, DEFAULT_CUSTOM_ENTITY_SETTINGS } from '@/lib/game/types'
import { loadStats, formatPlayTime, loadCustomSettings, loadCustomTextures } from '@/lib/game/storage'
import { MenuBackground3D } from './menu-background-3d'
import { BarChart3, Trophy, Paintbrush, Play, X, Music } from 'lucide-react'

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void
  customTextures: string[]
  onTexturesChange: (textures: string[]) => void
  youtubeUrl: string
  onYoutubeUrlChange: (url: string) => void
  onOpenLeaderboard: () => void
  onOpenCustomize: () => void
  customSettings: CustomEntitySettings
}

export function MainMenu({ 
  onStartGame, 
  customTextures, 
  onTexturesChange,
  youtubeUrl,
  onYoutubeUrlChange,
  onOpenLeaderboard,
  onOpenCustomize,
  customSettings
}: MainMenuProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('horror')
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState<GameStats>(DEFAULT_GAME_STATS)
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)

  const config = GAME_MODE_CONFIGS[selectedMode]

  useEffect(() => {
    setStats(loadStats())
  }, [])

  // Check if using custom entity settings
  const isUsingCustomSettings = 
    customSettings.speed !== DEFAULT_CUSTOM_ENTITY_SETTINGS.speed ||
    customSettings.detectionRange !== DEFAULT_CUSTOM_ENTITY_SETTINGS.detectionRange ||
    customSettings.behavior !== DEFAULT_CUSTOM_ENTITY_SETTINGS.behavior ||
    customTextures.length > 0

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ fontFamily: config.fontFamily }}>
      {/* 3D Background */}
      <MenuBackground3D mode={selectedMode} />

      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Top Bar - Stats & Leaderboard */}
        <div className="flex justify-between items-start p-4 md:p-6">
          {/* Stats Button - Top Left */}
          <button
            onClick={() => setShowStats(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md border transition-all hover:scale-105"
            style={{ 
              backgroundColor: `${config.uiPrimaryColor}cc`,
              borderColor: `${config.uiAccentColor}40`
            }}
          >
            <BarChart3 className="w-5 h-5" style={{ color: config.uiAccentColor }} />
            <span className="text-white text-sm font-medium hidden sm:inline">Stats</span>
          </button>

          {/* Leaderboard Button - Top Right */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md border transition-all hover:scale-105"
            style={{ 
              backgroundColor: `${config.uiPrimaryColor}cc`,
              borderColor: `${config.uiAccentColor}40`
            }}
          >
            <Trophy className="w-5 h-5" style={{ color: config.uiAccentColor }} />
            <span className="text-white text-sm font-medium hidden sm:inline">Leaderboard</span>
          </button>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Title */}
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-2 text-center"
            style={{ 
              color: config.uiAccentColor,
              textShadow: `0 0 30px ${config.uiAccentColor}60, 0 0 60px ${config.uiAccentColor}30`
            }}
          >
            MemeRooms
          </h1>

          {/* Version */}
          <p className="text-gray-400 text-sm mb-8">v2026.06.03.1</p>

          {/* Mode Selection */}
          <div className="flex gap-3 mb-8">
            {(Object.keys(GAME_MODE_CONFIGS) as GameMode[]).map((mode) => {
              const modeConfig = GAME_MODE_CONFIGS[mode]
              const isSelected = mode === selectedMode
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                    isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: isSelected ? modeConfig.uiAccentColor : 'transparent',
                    backgroundColor: isSelected ? `${modeConfig.uiAccentColor}20` : `${modeConfig.uiSecondaryColor}80`,
                    fontFamily: modeConfig.fontFamily
                  }}
                >
                  <span className="text-xl">{modeConfig.icon}</span>
                  <span className="text-white text-sm ml-2 hidden sm:inline">{modeConfig.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Customize Button */}
            <button
              onClick={onOpenCustomize}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border transition-all hover:scale-[1.02] relative"
              style={{ 
                backgroundColor: `${config.uiSecondaryColor}cc`,
                borderColor: `${config.uiAccentColor}40`
              }}
            >
              <Paintbrush className="w-5 h-5" style={{ color: config.uiAccentColor }} />
              <span className="text-white font-medium">Customize</span>
              {isUsingCustomSettings && (
                <span 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.uiAccentColor }}
                />
              )}
            </button>

            {/* Start Game Button */}
            <button
              onClick={() => onStartGame(selectedMode)}
              className="flex items-center justify-center gap-2 py-4 rounded-xl text-white text-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: config.uiAccentColor,
                boxShadow: `0 0 40px ${config.uiAccentColor}60`
              }}
            >
              <Play className="w-6 h-6" fill="currentColor" />
              START GAME
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-between items-end p-4 md:p-6">
          {/* YouTube Input - Bottom Left */}
          <div className="relative">
            {showYoutubeInput ? (
              <div 
                className="flex items-center gap-2 p-2 rounded-xl backdrop-blur-md border"
                style={{ 
                  backgroundColor: `${config.uiPrimaryColor}cc`,
                  borderColor: `${config.uiAccentColor}40`
                }}
              >
                <Music className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => onYoutubeUrlChange(e.target.value)}
                  placeholder="YouTube URL..."
                  className="w-40 sm:w-56 px-2 py-1 rounded bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowYoutubeInput(false)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowYoutubeInput(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border transition-all hover:scale-105"
                style={{ 
                  backgroundColor: `${config.uiPrimaryColor}cc`,
                  borderColor: `${config.uiAccentColor}40`
                }}
              >
                <Music className="w-4 h-4" style={{ color: youtubeUrl ? config.uiAccentColor : '#9ca3af' }} />
                <span className="text-gray-400 text-xs hidden sm:inline">
                  {youtubeUrl ? 'Audio set' : 'Custom audio'}
                </span>
              </button>
            )}
          </div>

          {/* Credits - Bottom Right */}
          <div className="text-right text-gray-500 text-xs sm:text-sm">
            Made by{' '}
            <a 
              href="https://dewanmukto.github.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Dewan Mukto
            </a>
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowStats(false)}
        >
          <div 
            className="p-6 md:p-8 rounded-2xl max-w-md w-full"
            style={{ backgroundColor: config.uiSecondaryColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 
                className="text-2xl md:text-3xl font-bold flex items-center gap-2"
                style={{ color: config.uiAccentColor }}
              >
                <BarChart3 className="w-6 h-6" />
                Your Stats
              </h2>
              <button
                onClick={() => setShowStats(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-gray-300">
                <span>Total Play Time:</span>
                <span className="font-bold">{formatPlayTime(stats.totalMinutesPlayed)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Games Started:</span>
                <span className="font-bold">{stats.totalGamesStarted}</span>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5" style={{ color: config.uiAccentColor }} />
                  Top 3 High Scores
                </h3>
                {stats.highScores.length === 0 ? (
                  <p className="text-gray-500 text-sm">No high scores yet. Play to set records!</p>
                ) : (
                  <div className="space-y-2">
                    {stats.highScores.map((score, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-center p-3 rounded-lg bg-black/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                          <span className="text-white font-bold">{score.score}</span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{GAME_MODE_CONFIGS[score.mode].icon} {score.mode}</div>
                          <div>{score.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

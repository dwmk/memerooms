'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { GameMode, GAME_MODE_CONFIGS, GameStats, DEFAULT_GAME_STATS } from '@/lib/game/types'
import { loadStats, formatPlayTime } from '@/lib/game/storage'

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void
  customTextures: string[]
  onTexturesChange: (textures: string[]) => void
  youtubeUrl: string
  onYoutubeUrlChange: (url: string) => void
}

export function MainMenu({ 
  onStartGame, 
  customTextures, 
  onTexturesChange,
  youtubeUrl,
  onYoutubeUrlChange 
}: MainMenuProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('horror')
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState<GameStats>(DEFAULT_GAME_STATS)
  const [isDragging, setIsDragging] = useState(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setStats(loadStats())
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    )
    
    if (files.length > 0) {
      const newTextures: string[] = []
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = () => {
          newTextures.push(reader.result as string)
          if (newTextures.length === files.length) {
            onTexturesChange([...customTextures, ...newTextures])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }, [customTextures, onTexturesChange])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newTextures: string[] = []
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = () => {
          newTextures.push(reader.result as string)
          if (newTextures.length === files.length) {
            onTexturesChange([...customTextures, ...newTextures])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }, [customTextures, onTexturesChange])

  const removeTexture = (index: number) => {
    const newTextures = [...customTextures]
    newTextures.splice(index, 1)
    onTexturesChange(newTextures)
  }

  const config = GAME_MODE_CONFIGS[selectedMode]

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 overflow-auto"
      style={{ 
        background: `linear-gradient(135deg, ${config.uiPrimaryColor} 0%, ${config.uiSecondaryColor} 100%)`,
        fontFamily: config.fontFamily
      }}
    >
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 
            className="text-5xl md:text-7xl font-bold mb-2"
            style={{ 
              color: config.uiAccentColor,
              textShadow: `0 0 20px ${config.uiAccentColor}40`
            }}
          >
            MemeRooms
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Escape the endless backrooms. Watch out for the nextbots.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {(Object.keys(GAME_MODE_CONFIGS) as GameMode[]).map((mode) => {
            const modeConfig = GAME_MODE_CONFIGS[mode]
            const isSelected = mode === selectedMode
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`p-4 md:p-6 rounded-xl border-2 transition-all duration-300 ${
                  isSelected 
                    ? 'scale-105' 
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  borderColor: isSelected ? modeConfig.uiAccentColor : 'transparent',
                  backgroundColor: `${modeConfig.uiSecondaryColor}cc`,
                  boxShadow: isSelected ? `0 0 30px ${modeConfig.uiAccentColor}40` : 'none',
                  fontFamily: modeConfig.fontFamily
                }}
              >
                <div className="text-3xl md:text-4xl mb-2">{modeConfig.icon}</div>
                <div className="text-white text-sm md:text-base font-bold">{modeConfig.name}</div>
              </button>
            )
          })}
        </div>

        {/* Custom Textures Drop Zone */}
        <div 
          ref={dropZoneRef}
          className={`p-4 md:p-6 rounded-xl border-2 border-dashed transition-all duration-300 ${
            isDragging ? 'border-white bg-white/10' : 'border-gray-600'
          }`}
          style={{ backgroundColor: `${config.uiSecondaryColor}80` }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <p className="text-gray-300 text-sm md:text-base mb-2">
              Drag & drop images here to customize Nextbots
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg text-white text-sm transition-colors"
              style={{ backgroundColor: config.uiAccentColor }}
            >
              Or Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          {customTextures.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {customTextures.map((texture, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={texture} 
                    alt={`Custom ${index + 1}`}
                    className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeTexture(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* YouTube URL Input */}
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: `${config.uiSecondaryColor}80` }}
        >
          <label className="block text-gray-300 text-sm mb-2">
            🎵 YouTube Audio Override (Playlist or Video URL)
          </label>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or playlist URL"
            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-white/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Play Button */}
        <button
          onClick={() => onStartGame(selectedMode)}
          className="w-full py-4 md:py-5 rounded-xl text-xl md:text-2xl font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ 
            backgroundColor: config.uiAccentColor,
            boxShadow: `0 0 40px ${config.uiAccentColor}60`
          }}
        >
          ▶ START GAME
        </button>

        {/* Stats Button */}
        <button
          onClick={() => setShowStats(true)}
          className="w-full py-3 rounded-xl text-gray-300 border border-gray-600 hover:border-gray-400 transition-colors"
        >
          📊 View Stats
        </button>

        {/* Credits */}
        <div className="text-right text-gray-500 text-sm">
          Made by <span className="text-gray-400 font-bold"><a target="_blank" href="https://dewanmukto.github.io">Dewan Mukto</a></span>
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
            <h2 
              className="text-2xl md:text-3xl font-bold mb-6"
              style={{ color: config.uiAccentColor }}
            >
              📊 Your Stats
            </h2>
            
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
                <h3 className="text-lg font-bold text-white mb-3">🏆 Top 3 High Scores</h3>
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
            
            <button
              onClick={() => setShowStats(false)}
              className="mt-6 w-full py-3 rounded-lg text-white transition-colors"
              style={{ backgroundColor: config.uiAccentColor }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

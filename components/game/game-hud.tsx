'use client'

import { useEffect, useRef, useState } from 'react'
import { GameMode, GAME_MODE_CONFIGS } from '@/lib/game/types'

interface GameHUDProps {
  score: number
  health: number
  mode: GameMode
  bhopMultiplier: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onQuit: () => void
}

export function GameHUD({
  score,
  health,
  mode,
  bhopMultiplier,
  isPaused,
  onPause,
  onResume,
  onQuit
}: GameHUDProps) {
  const config = GAME_MODE_CONFIGS[mode]
  
  // Health bar color changes based on health level
  const getHealthColor = () => {
    if (health > 60) return config.healthBarColor
    if (health > 30) return '#FFA500'
    return '#FF0000'
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Score - Top Center */}
      <div 
        className="absolute top-4 left-1/2 -translate-x-1/2"
        style={{ fontFamily: config.fontFamily }}
      >
        <div 
          className="px-6 py-3 rounded-xl backdrop-blur-md border"
          style={{ 
            backgroundColor: `${config.uiPrimaryColor}cc`,
            borderColor: config.uiAccentColor + '40'
          }}
        >
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Score</div>
            <div 
              className="text-3xl md:text-4xl font-bold"
              style={{ color: config.uiAccentColor }}
            >
              {score}
            </div>
          </div>
        </div>
      </div>

      {/* Bhop Indicator - Top Right */}
      {bhopMultiplier > 1.05 && (
        <div 
          className="absolute top-4 right-4"
          style={{ fontFamily: config.fontFamily }}
        >
          <div 
            className="px-4 py-2 rounded-xl backdrop-blur-md animate-pulse"
            style={{ 
              backgroundColor: `${config.uiAccentColor}40`,
              border: `2px solid ${config.uiAccentColor}`
            }}
          >
            <div className="text-xs text-white uppercase tracking-wider">BHOP</div>
            <div 
              className="text-xl font-bold"
              style={{ color: config.uiAccentColor }}
            >
              {bhopMultiplier.toFixed(2)}x
            </div>
          </div>
        </div>
      )}

      {/* Health Bar - Bottom Center */}
      <div 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 md:w-80"
        style={{ fontFamily: config.fontFamily }}
      >
        <div 
          className="p-2 rounded-xl backdrop-blur-md border"
          style={{ 
            backgroundColor: `${config.uiPrimaryColor}cc`,
            borderColor: config.uiAccentColor + '40'
          }}
        >
          <div className="flex justify-between items-center mb-1 px-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Health</span>
            <span 
              className="text-sm font-bold"
              style={{ color: getHealthColor() }}
            >
              {health}%
            </span>
          </div>
          <div className="h-4 bg-black/50 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300 rounded-full"
              style={{ 
                width: `${health}%`,
                backgroundColor: getHealthColor(),
                boxShadow: `0 0 10px ${getHealthColor()}`
              }}
            />
          </div>
        </div>
      </div>

      {/* Pause Button - Top Left */}
      <button
        onClick={onPause}
        className="absolute top-4 left-4 p-3 rounded-xl backdrop-blur-md border pointer-events-auto transition-colors hover:bg-white/10"
        style={{ 
          backgroundColor: `${config.uiPrimaryColor}cc`,
          borderColor: config.uiAccentColor + '40'
        }}
      >
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div 
          className="w-1 h-1 rounded-full"
          style={{ backgroundColor: config.uiAccentColor }}
        />
      </div>

      {/* Pause Menu */}
      {isPaused && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
          style={{ fontFamily: config.fontFamily }}
        >
          <div 
            className="p-8 rounded-2xl max-w-sm w-full mx-4"
            style={{ backgroundColor: config.uiSecondaryColor }}
          >
            <h2 
              className="text-3xl font-bold mb-6 text-center"
              style={{ color: config.uiAccentColor }}
            >
              PAUSED
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={onResume}
                className="w-full py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: config.uiAccentColor }}
              >
                ▶ Resume
              </button>
              
              <button
                onClick={onQuit}
                className="w-full py-3 rounded-xl text-white border border-gray-600 hover:border-gray-400 transition-colors"
              >
                ✕ Quit to Menu
              </button>
            </div>
            
            <div className="mt-6 text-center text-gray-500 text-sm">
              Press ESC to resume
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface GameOverScreenProps {
  score: number
  mode: GameMode
  onRestart: () => void
  onQuit: () => void
}

export function GameOverScreen({ score, mode, onRestart, onQuit }: GameOverScreenProps) {
  const config = GAME_MODE_CONFIGS[mode]

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      style={{ fontFamily: config.fontFamily }}
    >
      <div 
        className="p-8 md:p-12 rounded-2xl max-w-md w-full mx-4 text-center"
        style={{ backgroundColor: config.uiSecondaryColor }}
      >
        <div className="text-6xl mb-4">💀</div>
        <h2 
          className="text-4xl md:text-5xl font-bold mb-2"
          style={{ color: '#FF0000' }}
        >
          GAME OVER
        </h2>
        
        <p className="text-gray-400 mb-6">You were caught by a Nextbot!</p>
        
        <div 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: config.uiPrimaryColor }}
        >
          <div className="text-sm text-gray-400 uppercase tracking-wider">Final Score</div>
          <div 
            className="text-5xl font-bold"
            style={{ color: config.uiAccentColor }}
          >
            {score}
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: config.uiAccentColor }}
          >
            🔄 Play Again
          </button>
          
          <button
            onClick={onQuit}
            className="w-full py-3 rounded-xl text-white border border-gray-600 hover:border-gray-400 transition-colors"
          >
            ✕ Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}

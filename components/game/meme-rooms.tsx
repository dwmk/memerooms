'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameMode, PlayerState, DEFAULT_PLAYER_STATE, CustomEntitySettings, DEFAULT_CUSTOM_ENTITY_SETTINGS } from '@/lib/game/types'
import { loadCustomSettings, loadCustomTextures, saveCustomTextures } from '@/lib/game/storage'
import { MainMenu } from '@/components/game/main-menu'
import { GameHUD } from '@/components/game/game-hud'
import { ScoreSubmitModal } from '@/components/game/score-submit-modal'
import { LeaderboardModal } from '@/components/game/leaderboard-modal'
import { CustomizeModal } from '@/components/game/customize-modal'
import { MobileControls, RotateDeviceModal, useMobileDetection } from '@/components/game/mobile-controls'
import { useGameEngine } from '@/components/game/game-engine'

export default function MemeRoomsGame() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [mode, setMode] = useState<GameMode>('horror')
  const [customTextures, setCustomTextures] = useState<string[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(100)
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE)
  const [isPaused, setIsPaused] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  
  // New state for modals and custom settings
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [customSettings, setCustomSettings] = useState<CustomEntitySettings>(DEFAULT_CUSTOM_ENTITY_SETTINGS)

  const { isMobile, isPortrait } = useMobileDetection()

  // Load saved settings and textures on mount
  useEffect(() => {
    setCustomSettings(loadCustomSettings())
    setCustomTextures(loadCustomTextures())
  }, [])

  const handleGameOver = useCallback((gameScore: number) => {
    setFinalScore(gameScore)
    setGameState('gameover')
  }, [])

  const {
    containerRef,
    setJoystickInput,
    setMobileJump,
    requestPointerLock,
    setPaused,
    startGame,
    reset,
    cleanup
  } = useGameEngine({
    mode,
    customTextures,
    youtubeUrl: youtubeUrl || null,
    onScoreChange: setScore,
    onHealthChange: setHealth,
    onPlayerStateChange: setPlayerState,
    onGameOver: handleGameOver,
    customEntitySettings: customSettings, // Pass custom settings to game engine
  })

  const handleStartGame = useCallback((selectedMode: GameMode) => {
    setMode(selectedMode)
    setScore(0)
    setHealth(100)
    setIsPaused(false)
    setGameState('playing')
    
    // Start the game engine
    startGame(selectedMode)
    
    // Request pointer lock after a short delay
    setTimeout(() => {
      if (!isMobile) {
        requestPointerLock()
      }
    }, 200)
  }, [isMobile, requestPointerLock, startGame])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    setPaused(true)
    document.exitPointerLock()
  }, [setPaused])

  const handleResume = useCallback(() => {
    setIsPaused(false)
    setPaused(false)
    if (!isMobile) {
      requestPointerLock()
    }
  }, [isMobile, requestPointerLock, setPaused])

  const handleQuit = useCallback(() => {
    cleanup()
    setGameState('menu')
    setScore(0)
    setHealth(100)
    setIsPaused(false)
  }, [cleanup])

  const handleRestart = useCallback(() => {
    setScore(0)
    setHealth(100)
    setIsPaused(false)
    setGameState('playing')
    reset()
    
    setTimeout(() => {
      if (!isMobile) {
        requestPointerLock()
      }
    }, 200)
  }, [isMobile, requestPointerLock, reset])

  const handleTexturesChange = useCallback((textures: string[]) => {
    setCustomTextures(textures)
    saveCustomTextures(textures)
  }, [])

  // Handle ESC key for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        if (isPaused) {
          handleResume()
        } else {
          handlePause()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, isPaused, handlePause, handleResume])

  // Handle click to request pointer lock
  useEffect(() => {
    const handleClick = () => {
      if (gameState === 'playing' && !isPaused && !isMobile) {
        requestPointerLock()
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [gameState, isPaused, isMobile, requestPointerLock])

  // Show rotate device modal on mobile portrait
  if (isMobile && isPortrait) {
    return <RotateDeviceModal />
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {/* Main Menu */}
      {gameState === 'menu' && (
        <>
          <MainMenu
            onStartGame={handleStartGame}
            customTextures={customTextures}
            onTexturesChange={handleTexturesChange}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={setYoutubeUrl}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenCustomize={() => setShowCustomize(true)}
            customSettings={customSettings}
          />

          {/* Leaderboard Modal */}
          <LeaderboardModal
            isOpen={showLeaderboard}
            onClose={() => setShowLeaderboard(false)}
            mode={mode}
          />

          {/* Customize Modal */}
          <CustomizeModal
            isOpen={showCustomize}
            onClose={() => setShowCustomize(false)}
            mode={mode}
            customTextures={customTextures}
            onTexturesChange={handleTexturesChange}
            customSettings={customSettings}
            onSettingsChange={setCustomSettings}
          />
        </>
      )}

      {/* Game Canvas */}
      {(gameState === 'playing' || gameState === 'gameover') && (
        <>
          <div 
            ref={containerRef} 
            className="w-full h-full"
            style={{ cursor: isPaused ? 'default' : 'none' }}
          />
          
          {/* Game HUD */}
          {gameState === 'playing' && (
            <GameHUD
              score={score}
              health={health}
              mode={mode}
              bhopMultiplier={playerState.bhopMultiplier}
              isPaused={isPaused}
              onPause={handlePause}
              onResume={handleResume}
              onQuit={handleQuit}
            />
          )}

          {/* Mobile Controls */}
          {isMobile && gameState === 'playing' && !isPaused && (
            <MobileControls
              onJoystickMove={setJoystickInput}
              onJump={setMobileJump}
            />
          )}

          {/* Score Submit Modal (replaces old GameOverScreen) */}
          {gameState === 'gameover' && (
            <ScoreSubmitModal
              isOpen={true}
              score={finalScore}
              mode={mode}
              onRestart={handleRestart}
              onQuit={handleQuit}
            />
          )}
        </>
      )}
    </div>
  )
}

'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameMode, PlayerState, DEFAULT_PLAYER_STATE } from '@/lib/game/types'
import { MainMenu } from '@/components/game/main-menu'
import { GameHUD, GameOverScreen } from '@/components/game/game-hud'
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

  const { isMobile, isPortrait } = useMobileDetection()

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
        <MainMenu
          onStartGame={handleStartGame}
          customTextures={customTextures}
          onTexturesChange={setCustomTextures}
          youtubeUrl={youtubeUrl}
          onYoutubeUrlChange={setYoutubeUrl}
        />
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

          {/* Game Over Screen */}
          {gameState === 'gameover' && (
            <GameOverScreen
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

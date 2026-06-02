'use client'

import { useRef, useCallback } from 'react'
import * as THREE from 'three'
import { GameMode, GAME_MODE_CONFIGS, PlayerState } from '@/lib/game/types'
import { BackroomsGenerator } from '@/lib/game/backrooms'
import { EntityManager } from '@/lib/game/entities'
import { PlayerController } from '@/lib/game/player'
import { incrementGamesStarted, addPlayTime, addHighScore } from '@/lib/game/storage'

interface GameEngineProps {
  mode: GameMode
  customTextures: string[]
  youtubeUrl: string | null
  onScoreChange: (score: number) => void
  onHealthChange: (health: number) => void
  onPlayerStateChange: (state: PlayerState) => void
  onGameOver: (finalScore: number) => void
}

export function useGameEngine({
  mode,
  customTextures,
  youtubeUrl,
  onScoreChange,
  onHealthChange,
  onPlayerStateChange,
  onGameOver,
}: GameEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const backroomsRef = useRef<BackroomsGenerator | null>(null)
  const entitiesRef = useRef<EntityManager | null>(null)
  const playerRef = useRef<PlayerController | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const scoreRef = useRef<number>(0)
  const gameStartTimeRef = useRef<number>(0)
  const isInitializedRef = useRef(false)
  const isPausedRef = useRef(false)
  const currentModeRef = useRef<GameMode>(mode)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const initScene = useCallback(() => {
    if (!containerRef.current || isInitializedRef.current) return

    const config = GAME_MODE_CONFIGS[currentModeRef.current]

    // Scene setup
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar)
    scene.background = new THREE.Color(config.fogColor)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 1.7, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false // Disabled for performance
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Ambient light - strong base lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, config.ambientLight + 0.3)
    scene.add(ambientLight)

    // Hemisphere light for sky/ground lighting
    const hemisphereLight = new THREE.HemisphereLight(
      config.lightColor, 
      config.floorColor, 
      0.6
    )
    scene.add(hemisphereLight)

    // Backrooms generator
    const backrooms = new BackroomsGenerator(scene, config)
    backrooms.generateChunk(0, 0)
    backroomsRef.current = backrooms

    // Entity manager
    const entities = new EntityManager(scene, camera, config)
    entities.setCustomTextures(customTextures)
    entitiesRef.current = entities

    // Player controller
    const player = new PlayerController(camera)
    playerRef.current = player

    // Spawn initial entities
    entities.spawnInitialEntities(player.getPosition(), 3)

    // Increment games started
    incrementGamesStarted()
    gameStartTimeRef.current = performance.now()
    scoreRef.current = 0

    isInitializedRef.current = true

    // Start game loop
    lastTimeRef.current = performance.now() / 1000
    gameLoop()

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return
      cameraRef.current.aspect = window.innerWidth / window.innerHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [customTextures])

  const gameLoop = useCallback(() => {
    if (!isInitializedRef.current) return

    const currentTime = performance.now() / 1000
    const deltaTime = Math.min(currentTime - lastTimeRef.current, 0.1)
    lastTimeRef.current = currentTime

    if (!isPausedRef.current && playerRef.current && backroomsRef.current && entitiesRef.current) {
      const config = GAME_MODE_CONFIGS[currentModeRef.current]

      // Update player
      const playerState = playerRef.current.update(deltaTime, currentTime)
      onPlayerStateChange(playerState)

      // Update colliders for player
      const colliders = backroomsRef.current.getColliders()
      playerRef.current.setColliders(colliders)

      // Generate chunks around player
      const playerPos = playerRef.current.getPosition()
      backroomsRef.current.generateChunk(playerPos.x, playerPos.z)

      // Update light flicker
      backroomsRef.current.updateLights(deltaTime)

      // Update entities
      const { isBeingChased, damageTaken } = entitiesRef.current.update(
        deltaTime,
        playerPos,
        currentTime
      )

      // Update score if being chased
      if (isBeingChased) {
        scoreRef.current += deltaTime
        onScoreChange(Math.floor(scoreRef.current))
      }

      // Handle damage
      if (damageTaken > 0) {
        playerRef.current.takeDamage(damageTaken)
        onHealthChange(playerRef.current.getState().health)

        // Check for game over
        if (!playerRef.current.isAlive()) {
          const finalScore = Math.floor(scoreRef.current)
          addHighScore(finalScore, currentModeRef.current)
          
          // Save play time
          const playTimeMinutes = (performance.now() - gameStartTimeRef.current) / 60000
          addPlayTime(playTimeMinutes)
          
          onGameOver(finalScore)
          return
        }
      }
    }

    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)
  }, [onHealthChange, onPlayerStateChange, onScoreChange, onGameOver])

  const setJoystickInput = useCallback((x: number, y: number, active: boolean) => {
    playerRef.current?.setJoystickInput(x, y, active)
  }, [])

  const setMobileJump = useCallback((pressed: boolean) => {
    playerRef.current?.setMobileJump(pressed)
  }, [])

  const requestPointerLock = useCallback(() => {
    playerRef.current?.requestPointerLock()
  }, [])

  const setPaused = useCallback((paused: boolean) => {
    isPausedRef.current = paused
    if (paused) {
      playerRef.current?.exitPointerLock()
    }
  }, [])

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (rendererRef.current && containerRef.current) {
      try {
        containerRef.current.removeChild(rendererRef.current.domElement)
      } catch (e) {
        // Element may already be removed
      }
      rendererRef.current.dispose()
    }

    playerRef.current?.cleanup()
    entitiesRef.current?.clear()
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    sceneRef.current = null
    cameraRef.current = null
    rendererRef.current = null
    backroomsRef.current = null
    entitiesRef.current = null
    playerRef.current = null
    isInitializedRef.current = false
    scoreRef.current = 0
  }, [])

  const startGame = useCallback((selectedMode: GameMode) => {
    currentModeRef.current = selectedMode
    isPausedRef.current = false
    
    // Clean up any previous game
    cleanup()
    
    // Initialize new game after a short delay
    setTimeout(() => {
      initScene()
    }, 50)
  }, [cleanup, initScene])

  const reset = useCallback(() => {
    cleanup()
    setTimeout(() => {
      initScene()
    }, 100)
  }, [cleanup, initScene])

  return {
    containerRef,
    setJoystickInput,
    setMobileJump,
    requestPointerLock,
    setPaused,
    startGame,
    reset,
    cleanup
  }
}

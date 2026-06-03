'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { GAME_MODE_CONFIGS, GameMode } from '@/lib/game/types'

interface MenuBackground3DProps {
  mode: GameMode
}

export function MenuBackground3D({ mode }: MenuBackground3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  const config = GAME_MODE_CONFIGS[mode]

  const createTextures = useCallback((cfg: typeof config) => {
    // Wall texture
    const wallCanvas = document.createElement('canvas')
    wallCanvas.width = 256
    wallCanvas.height = 256
    const wallCtx = wallCanvas.getContext('2d')!
    const r = (cfg.wallColor >> 16) & 255
    const g = (cfg.wallColor >> 8) & 255
    const b = cfg.wallColor & 255
    wallCtx.fillStyle = `rgb(${r}, ${g}, ${b})`
    wallCtx.fillRect(0, 0, 256, 256)
    wallCtx.fillStyle = 'rgba(0,0,0,0.08)'
    for (let x = 0; x < 256; x += 16) {
      wallCtx.fillRect(x, 0, 8, 256)
    }
    const wallTexture = new THREE.CanvasTexture(wallCanvas)
    wallTexture.wrapS = THREE.RepeatWrapping
    wallTexture.wrapT = THREE.RepeatWrapping
    wallTexture.repeat.set(2, 2)

    // Floor texture
    const floorCanvas = document.createElement('canvas')
    floorCanvas.width = 256
    floorCanvas.height = 256
    const floorCtx = floorCanvas.getContext('2d')!
    const fr = (cfg.floorColor >> 16) & 255
    const fg = (cfg.floorColor >> 8) & 255
    const fb = cfg.floorColor & 255
    floorCtx.fillStyle = `rgb(${fr}, ${fg}, ${fb})`
    floorCtx.fillRect(0, 0, 256, 256)
    floorCtx.strokeStyle = 'rgba(0,0,0,0.2)'
    floorCtx.lineWidth = 2
    for (let i = 0; i <= 256; i += 32) {
      floorCtx.beginPath()
      floorCtx.moveTo(i, 0)
      floorCtx.lineTo(i, 256)
      floorCtx.moveTo(0, i)
      floorCtx.lineTo(256, i)
      floorCtx.stroke()
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas)
    floorTexture.wrapS = THREE.RepeatWrapping
    floorTexture.wrapT = THREE.RepeatWrapping
    floorTexture.repeat.set(8, 8)

    // Ceiling texture
    const ceilCanvas = document.createElement('canvas')
    ceilCanvas.width = 256
    ceilCanvas.height = 256
    const ceilCtx = ceilCanvas.getContext('2d')!
    const cr = (cfg.ceilingColor >> 16) & 255
    const cg = (cfg.ceilingColor >> 8) & 255
    const cb = cfg.ceilingColor & 255
    ceilCtx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`
    ceilCtx.fillRect(0, 0, 256, 256)
    ceilCtx.strokeStyle = 'rgba(0,0,0,0.2)'
    ceilCtx.lineWidth = 3
    for (let i = 0; i <= 256; i += 64) {
      ceilCtx.beginPath()
      ceilCtx.moveTo(i, 0)
      ceilCtx.lineTo(i, 256)
      ceilCtx.moveTo(0, i)
      ceilCtx.lineTo(256, i)
      ceilCtx.stroke()
    }
    const ceilTexture = new THREE.CanvasTexture(ceilCanvas)
    ceilTexture.wrapS = THREE.RepeatWrapping
    ceilTexture.wrapT = THREE.RepeatWrapping
    ceilTexture.repeat.set(8, 8)

    return { wallTexture, floorTexture, ceilTexture }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
    cameraRef.current = camera
    camera.position.set(0, 1.8, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Fog
    scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar)
    scene.background = new THREE.Color(config.fogColor)

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, config.ambientLight * 0.5)
    scene.add(ambient)

    // Create textures
    const { wallTexture, floorTexture, ceilTexture } = createTextures(config)

    // Create a simple corridor layout
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture, side: THREE.DoubleSide })
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTexture })
    const ceilMat = new THREE.MeshLambertMaterial({ map: ceilTexture })

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    scene.add(floor)

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), ceilMat)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = 5
    scene.add(ceiling)

    // Corridor walls - create a simple backrooms-like layout
    const wallHeight = 5
    const corridorWidth = 8

    // Main corridor walls
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallHeight, 100), wallMat)
    leftWall.position.set(-corridorWidth / 2, wallHeight / 2, 0)
    scene.add(leftWall)

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallHeight, 100), wallMat)
    rightWall.position.set(corridorWidth / 2, wallHeight / 2, 0)
    scene.add(rightWall)

    // Cross walls with openings
    for (let z = -40; z < 40; z += 20) {
      // Left alcove wall
      if (Math.abs(z) > 5) {
        const alcoveWall = new THREE.Mesh(new THREE.BoxGeometry(4, wallHeight, 0.3), wallMat)
        alcoveWall.position.set(-corridorWidth / 2 - 2, wallHeight / 2, z)
        scene.add(alcoveWall)
      }

      // Right alcove wall
      if (Math.abs(z) > 10) {
        const alcoveWall2 = new THREE.Mesh(new THREE.BoxGeometry(4, wallHeight, 0.3), wallMat)
        alcoveWall2.position.set(corridorWidth / 2 + 2, wallHeight / 2, z)
        scene.add(alcoveWall2)
      }
    }

    // Add columns
    for (let z = -30; z < 30; z += 15) {
      const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, wallHeight, 0.6), wallMat)
      col1.position.set(-2, wallHeight / 2, z)
      scene.add(col1)

      const col2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, wallHeight, 0.6), wallMat)
      col2.position.set(2, wallHeight / 2, z)
      scene.add(col2)
    }

    // Lights along ceiling
    for (let z = -40; z < 40; z += 10) {
      const lightFixture = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.1, 0.4),
        new THREE.MeshBasicMaterial({ color: config.lightColor, transparent: true, opacity: 0.9 })
      )
      lightFixture.position.set(0, 4.95, z)
      scene.add(lightFixture)

      const pointLight = new THREE.PointLight(config.lightColor, config.lightIntensity * 0.5, 20)
      pointLight.position.set(0, 4.5, z)
      scene.add(pointLight)
    }

    // Animation loop - smooth camera movement through corridors
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.003

      // Camera follows a gentle forward path with subtle side-to-side sway
      const t = timeRef.current
      camera.position.z = (t * 5) % 80 - 40
      camera.position.x = Math.sin(t * 0.5) * 1.5
      camera.rotation.y = Math.sin(t * 0.3) * 0.15

      // Slight head bob
      camera.position.y = 1.8 + Math.sin(t * 4) * 0.05

      renderer.render(scene, camera)
    }

    animate()

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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement)
      }
      rendererRef.current?.dispose()
    }
  }, [config, createTextures])

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 -z-10"
      style={{ filter: 'brightness(0.7) blur(1px)' }}
    />
  )
}

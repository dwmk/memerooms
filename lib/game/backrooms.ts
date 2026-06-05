import * as THREE from 'three'
import { GameModeConfig } from './types'

// Much larger room dimensions for less cramped feel
const ROOM_SIZE = 16
const WALL_HEIGHT = 5.5  // Much higher ceilings
const CORRIDOR_WIDTH = 6
const LIGHT_SPACING = 12  // More frequent lights

export class BackroomsGenerator {
  private scene: THREE.Scene
  private config: GameModeConfig
  private generatedChunks: Set<string> = new Set()
  private chunkSize = 64  // Larger chunks
  private lights: { light: THREE.PointLight; fixture: THREE.Mesh; isOn: boolean; flickerPhase: number }[] = []
  private flickerTime = 0
  private maxLights = 24
  
  // Texture canvases
  private wallTexture: THREE.CanvasTexture | null = null
  private floorTexture: THREE.CanvasTexture | null = null
  private ceilingTexture: THREE.CanvasTexture | null = null

  constructor(scene: THREE.Scene, config: GameModeConfig) {
    this.scene = scene
    this.config = config
    this.createTextures()
  }

  private createTextures() {
    // Create classic backrooms wallpaper texture
    this.wallTexture = this.createWallpaperTexture()
    // Create floor tile texture
    this.floorTexture = this.createFloorTileTexture()
    // Create ceiling panel texture
    this.ceilingTexture = this.createCeilingPanelTexture()
  }

  private createWallpaperTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Base color - yellowish wallpaper
    const baseColor = this.config.wallColor
    const r = (baseColor >> 16) & 255
    const g = (baseColor >> 8) & 255
    const b = baseColor & 255
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(0, 0, 512, 512)

    // Add vertical stripes pattern (classic backrooms wallpaper)
    ctx.fillStyle = `rgba(0, 0, 0, 0.08)`
    for (let x = 0; x < 512; x += 32) {
      ctx.fillRect(x, 0, 16, 512)
    }

    // Add horizontal bands
    ctx.fillStyle = `rgba(0, 0, 0, 0.05)`
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(0, y, 512, 2)
    }

    // Add subtle stains and wear
    ctx.fillStyle = `rgba(139, 90, 43, 0.15)`
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const size = 20 + Math.random() * 60
      ctx.beginPath()
      ctx.ellipse(x, y, size, size * 0.6, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    // Add water damage marks
    ctx.fillStyle = `rgba(80, 60, 40, 0.1)`
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 512
      ctx.fillRect(x, 0, 30 + Math.random() * 50, 200 + Math.random() * 312)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2, 2)
    return texture
  }

  private createFloorTileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Base carpet/tile color
    const baseColor = this.config.floorColor
    const r = (baseColor >> 16) & 255
    const g = (baseColor >> 8) & 255
    const b = baseColor & 255
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(0, 0, 512, 512)

    // Grid pattern for tiles
    ctx.strokeStyle = `rgba(0, 0, 0, 0.2)`
    ctx.lineWidth = 3
    const tileSize = 64
    for (let x = 0; x <= 512; x += tileSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 512)
      ctx.stroke()
    }
    for (let y = 0; y <= 512; y += tileSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    // Add carpet-like noise texture
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 0 : 255}, ${Math.random() > 0.5 ? 0 : 255}, ${Math.random() > 0.5 ? 0 : 255}, 0.03)`
      ctx.fillRect(x, y, 2, 2)
    }

    // Stains
    ctx.fillStyle = `rgba(60, 40, 30, 0.15)`
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const size = 30 + Math.random() * 80
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    return texture
  }

  private createCeilingPanelTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Base ceiling color - off-white/cream
    const baseColor = this.config.ceilingColor
    const r = (baseColor >> 16) & 255
    const g = (baseColor >> 8) & 255
    const b = baseColor & 255
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(0, 0, 512, 512)

    // Ceiling panel grid (drop ceiling style)
    const panelSize = 128
    ctx.strokeStyle = `rgba(0, 0, 0, 0.3)`
    ctx.lineWidth = 4
    for (let x = 0; x <= 512; x += panelSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 512)
      ctx.stroke()
    }
    for (let y = 0; y <= 512; y += panelSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    // Panel texture dots (acoustic ceiling)
    ctx.fillStyle = `rgba(0, 0, 0, 0.05)`
    for (let px = 0; px < 4; px++) {
      for (let py = 0; py < 4; py++) {
        const offsetX = px * panelSize + 10
        const offsetY = py * panelSize + 10
        for (let i = 0; i < 100; i++) {
          const x = offsetX + Math.random() * (panelSize - 20)
          const y = offsetY + Math.random() * (panelSize - 20)
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Water stains on ceiling
    ctx.fillStyle = `rgba(120, 100, 70, 0.12)`
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const size = 40 + Math.random() * 100
      ctx.beginPath()
      ctx.ellipse(x, y, size, size * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    return texture
  }

  updateConfig(config: GameModeConfig) {
    this.config = config
    // Recreate textures with new colors
    this.createTextures()
    this.updateMaterials()
  }

  private getChunkKey(x: number, z: number): string {
    const chunkX = Math.floor(x / this.chunkSize)
    const chunkZ = Math.floor(z / this.chunkSize)
    return `${chunkX},${chunkZ}`
  }

  private createWallMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      map: this.wallTexture,
      side: THREE.DoubleSide
    })
  }

  private createFloorMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      map: this.floorTexture
    })
  }

  private createCeilingMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      map: this.ceilingTexture
    })
  }

  private updateMaterials() {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const mesh = object as THREE.Mesh
        if (mesh.userData.type === 'wall') {
          const mat = mesh.material as THREE.MeshLambertMaterial
          mat.map = this.wallTexture
          mat.needsUpdate = true
        } else if (mesh.userData.type === 'floor') {
          const mat = mesh.material as THREE.MeshLambertMaterial
          mat.map = this.floorTexture
          mat.needsUpdate = true
        } else if (mesh.userData.type === 'ceiling') {
          const mat = mesh.material as THREE.MeshLambertMaterial
          mat.map = this.ceilingTexture
          mat.needsUpdate = true
        }
      }
    })

    this.lights.forEach(({ light, fixture }) => {
      light.color.setHex(this.config.lightColor)
      light.intensity = this.config.lightIntensity
      if (fixture.material instanceof THREE.MeshBasicMaterial) {
        fixture.material.color.setHex(this.config.lightColor)
      }
    })

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(this.config.fogColor)
      this.scene.fog.near = this.config.fogNear
      this.scene.fog.far = this.config.fogFar
    }
  }

  generateChunk(playerX: number, playerZ: number) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const checkX = playerX + dx * this.chunkSize
        const checkZ = playerZ + dz * this.chunkSize
        const key = this.getChunkKey(checkX, checkZ)
        
        if (!this.generatedChunks.has(key)) {
          this.createChunkGeometry(key)
          this.generatedChunks.add(key)
        }
      }
    }
  }

private createChunkGeometry(chunkKey: string) {
    const [chunkXStr, chunkZStr] = chunkKey.split(',')
    const chunkX = parseInt(chunkXStr) * this.chunkSize
    const chunkZ = parseInt(chunkZStr) * this.chunkSize

    const seed = this.hashCode(chunkKey)
    const random = this.seededRandom(seed)
    const roomStyleType = random()

    // Base Floor (Ground Level)
    this.createFloorSegment(chunkX + this.chunkSize / 2, 0, chunkZ + this.chunkSize / 2, this.chunkSize, this.chunkSize)

    // Main Ceiling (Double height to accommodate 2 floors)
    const chunkHeight = WALL_HEIGHT * 2
    const ceilingGeometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize)
    const ceilingMaterial = this.createCeilingMaterial()
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.set(chunkX + this.chunkSize / 2, chunkHeight, chunkZ + this.chunkSize / 2)
    ceiling.userData.type = 'ceiling'
    this.scene.add(ceiling)

    // Procedural Architecture Distribution
    if (roomStyleType < 0.35) {
      // STYLE A: Dense Classic Labyrinth (Full height walls)
      for (let x = ROOM_SIZE; x < this.chunkSize; x += ROOM_SIZE) {
        for (let z = 0; z < this.chunkSize; z += ROOM_SIZE) {
           if (random() > 0.3) {
             this.createWall(chunkX + x, 0, chunkZ + z + ROOM_SIZE / 2, 0.4, ROOM_SIZE, chunkHeight, true)
           }
           if (random() > 0.5) {
             this.createWall(chunkX + x - ROOM_SIZE / 2, 0, chunkZ + z, ROOM_SIZE, 0.4, chunkHeight, false)
           }
        }
      }
    } else if (roomStyleType < 0.70) {
      // STYLE B: Multi-level Facility with Ramps and Balconies
      // 2nd Floor covering half of the room
      this.createFloorSegment(chunkX + this.chunkSize / 2, WALL_HEIGHT, chunkZ + this.chunkSize * 0.75, this.chunkSize, this.chunkSize / 2)
      
      // Support columns for the 2nd floor
      for (let x = ROOM_SIZE / 2; x < this.chunkSize; x += ROOM_SIZE) {
        this.createColumn(chunkX + x, 0, chunkZ + this.chunkSize / 2 + 0.5, WALL_HEIGHT)
      }

      // Ramp bridging Ground Floor to 2nd Floor
      this.createRamp(chunkX + this.chunkSize / 2, 0, chunkZ + this.chunkSize / 2, 8, 16, WALL_HEIGHT, false)
      
      // Walls on Ground Floor
      this.createWall(chunkX + this.chunkSize / 4, 0, chunkZ + this.chunkSize / 4, this.chunkSize / 2, 0.4, WALL_HEIGHT, false)
      
      // Walls on 2nd Floor (Acting as balcony barriers)
      this.createWall(chunkX + this.chunkSize / 2, WALL_HEIGHT, chunkZ + this.chunkSize / 2 + 1, this.chunkSize, 0.4, 2, false)
    } else {
      // STYLE C: Colossal Pillar Halls (Open expanses with columns)
      for (let x = ROOM_SIZE / 2; x < this.chunkSize; x += ROOM_SIZE) {
        for (let z = ROOM_SIZE / 2; z < this.chunkSize; z += ROOM_SIZE) {
          if (random() > 0.4) {
            this.createColumn(chunkX + x, 0, chunkZ + z, chunkHeight)
          }
          // Occasional low partition walls
          if (random() > 0.8) {
            this.createWall(chunkX + x, 0, chunkZ + z, ROOM_SIZE - 2, 0.6, WALL_HEIGHT * 0.7, random() > 0.5)
          }
        }
      }
    }

    // Multi-level Lighting Framework
    for (let yLevel = WALL_HEIGHT; yLevel <= chunkHeight; yLevel += WALL_HEIGHT) {
      for (let x = LIGHT_SPACING / 2; x < this.chunkSize; x += LIGHT_SPACING) {
        for (let z = LIGHT_SPACING / 2; z < this.chunkSize; z += LIGHT_SPACING) {
          if (this.lights.length < this.maxLights) {
            // Less lights in double-height open areas unless attached to something, spread randomly
            if (random() > 0.2) this.createLight(chunkX + x, yLevel, chunkZ + z)
          }
        }
      }
    }
  }

private createWall(x: number, y: number, z: number, width: number, depth: number, height: number, isVertical: boolean) {
    const geometry = isVertical 
      ? new THREE.BoxGeometry(depth, height, width)
      : new THREE.BoxGeometry(width, height, depth)
    const material = this.createWallMaterial()
    const wall = new THREE.Mesh(geometry, material)
    
    if (isVertical) {
      wall.position.set(x + depth / 2, y + height / 2, z + width / 2)
    } else {
      wall.position.set(x + width / 2, y + height / 2, z + depth / 2)
    }
    
    wall.userData.type = 'wall'
    wall.userData.isCollider = true
    wall.userData.isWall = true
    this.scene.add(wall)
  }

  private createColumn(x: number, y: number, z: number, height: number) {
    const geometry = new THREE.BoxGeometry(0.8, height, 0.8)
    const material = this.createWallMaterial()
    const column = new THREE.Mesh(geometry, material)
    column.position.set(x, y + height / 2, z)
    column.userData.type = 'wall'
    column.userData.isCollider = true
    column.userData.isWall = true
    this.scene.add(column)
  }

  private createFloorSegment(x: number, y: number, z: number, width: number, depth: number) {
    const geometry = new THREE.PlaneGeometry(width, depth)
    const material = this.createFloorMaterial()
    const floor = new THREE.Mesh(geometry, material)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(x, y, z)
    floor.userData.type = 'floor'
    floor.userData.isCollider = true
    floor.userData.isGround = true
    this.scene.add(floor)
  }

  private createRamp(x: number, y: number, z: number, width: number, depth: number, height: number, isVertical: boolean) {
    const length = Math.sqrt(depth * depth + height * height)
    const angle = Math.atan2(height, depth)
    
    const geometry = new THREE.BoxGeometry(width, 0.5, length)
    const material = this.createFloorMaterial()
    const ramp = new THREE.Mesh(geometry, material)
    
    ramp.position.set(x, y + height / 2, z)
    
    if (isVertical) {
      ramp.rotation.y = Math.PI / 2
    }
    ramp.rotation.x = -angle
    
    ramp.userData.type = 'floor'
    ramp.userData.isCollider = true
    ramp.userData.isGround = true
    this.scene.add(ramp)
  }

 private createLight(x: number, y: number, z: number) {
    const fixtureGeometry = new THREE.BoxGeometry(2.5, 0.15, 0.5)
    const fixtureMaterial = new THREE.MeshBasicMaterial({
      color: this.config.lightColor,
      transparent: true,
      opacity: 0.95
    })
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial)
    fixture.position.set(x, y - 0.08, z)
    this.scene.add(fixture)

    const light = new THREE.PointLight(this.config.lightColor, this.config.lightIntensity, 50)
    light.position.set(x, y - 0.4, z)
    this.scene.add(light)
    
    this.lights.push({ 
      light, 
      fixture, 
      isOn: true, 
      flickerPhase: Math.random() * Math.PI * 2 
    })
  }

 

  updateLights(deltaTime: number) {
    this.flickerTime += deltaTime

    this.lights.forEach((lightData, index) => {
      if (this.config.lightFlicker) {
        // Horror mode: Some lights randomly turn off, others flicker
        const flickerValue = Math.sin(this.flickerTime * 8 + lightData.flickerPhase) * 
                           Math.sin(this.flickerTime * 13 + index) *
                           Math.sin(this.flickerTime * 3)
        
        // Chance for light to turn off completely
        const offThreshold = Math.sin(this.flickerTime * 0.5 + lightData.flickerPhase * 2)
        
        if (offThreshold > 0.7) {
          // Light turns off
          lightData.light.intensity = 0
          if (lightData.fixture.material instanceof THREE.MeshBasicMaterial) {
            lightData.fixture.material.opacity = 0.1
          }
          lightData.isOn = false
        } else {
          // Light flickers
          const intensity = this.config.lightIntensity * (0.7 + flickerValue * 0.3 + Math.random() * 0.1)
          lightData.light.intensity = Math.max(0.2, intensity)
          if (lightData.fixture.material instanceof THREE.MeshBasicMaterial) {
            lightData.fixture.material.opacity = 0.5 + Math.min(0.45, intensity / this.config.lightIntensity * 0.45)
          }
          lightData.isOn = true
        }
      } else {
        // Steady lights for Aura/Goofy modes
        lightData.light.intensity = this.config.lightIntensity
        if (lightData.fixture.material instanceof THREE.MeshBasicMaterial) {
          lightData.fixture.material.opacity = 0.95
        }
      }
    })
  }

  getColliders(): THREE.Mesh[] {
    const colliders: THREE.Mesh[] = []
    this.scene.traverse((object) => {
      // Fetch both vertical walls and horizontal grounds for the new raycasting physics
      if (object instanceof THREE.Mesh && (object.userData.isCollider || object.userData.isGround || object.userData.isWall)) {
        colliders.push(object)
      }
    })
    return colliders
  }

  private hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
  }
}

import * as THREE from 'three'
import { EntityState, GameModeConfig } from './types'
import { v4 as uuidv4 } from 'crypto'

const ENTITY_HEIGHT = 4.5
const DAMAGE_COOLDOWN = 0.5
const DAMAGE_AMOUNT = 10

export class EntityManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private config: GameModeConfig
  private entities: Map<string, { state: EntityState; mesh: THREE.Mesh; sprite: THREE.Sprite }> = new Map()
  private textureLoader = new THREE.TextureLoader()
  private defaultTexture: THREE.Texture | null = null
  private customTextures: THREE.Texture[] = []
  private lastDamageTime = 0
  private mutationTime = 0

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, config: GameModeConfig) {
    this.scene = scene
    this.camera = camera
    this.config = config
    this.loadDefaultTexture()
  }

  private loadDefaultTexture() {
    // Create a placeholder texture with a scary face pattern
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    
    // Background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, 256, 256)
    
    // Creepy face pattern
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(80, 80, 25, 0, Math.PI * 2)
    ctx.arc(176, 80, 25, 0, Math.PI * 2)
    ctx.fill()
    
    // Mouth
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(128, 150, 60, 0.2, Math.PI - 0.2)
    ctx.stroke()
    
    this.defaultTexture = new THREE.CanvasTexture(canvas)
  }

  updateConfig(config: GameModeConfig) {
    this.config = config
  }

  setCustomTextures(imageUrls: string[]) {
    this.customTextures = []
    imageUrls.forEach(url => {
      const texture = this.textureLoader.load(url)
      texture.colorSpace = THREE.SRGBColorSpace
      this.customTextures.push(texture)
    })
    
    // Update existing entities with new textures
    this.entities.forEach(({ sprite }, id) => {
      const texture = this.getRandomTexture()
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.map = texture
        sprite.material.needsUpdate = true
      }
    })
  }

  private getRandomTexture(): THREE.Texture {
    if (this.customTextures.length > 0) {
      return this.customTextures[Math.floor(Math.random() * this.customTextures.length)]
    }
    return this.defaultTexture!
  }

  spawnEntity(position: THREE.Vector3) {
    const id = Math.random().toString(36).substring(7)
    
    const texture = this.getRandomTexture()
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.5
    })
    
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(ENTITY_HEIGHT * 0.8, ENTITY_HEIGHT, 1)
    sprite.position.copy(position)
    sprite.position.y = ENTITY_HEIGHT / 2

    // Invisible collision mesh
    const collisionGeometry = new THREE.BoxGeometry(1, ENTITY_HEIGHT, 1)
    const collisionMaterial = new THREE.MeshBasicMaterial({ visible: false })
    const mesh = new THREE.Mesh(collisionGeometry, collisionMaterial)
    mesh.position.copy(sprite.position)

    const state: EntityState = {
      id,
      position: { x: position.x, y: ENTITY_HEIGHT / 2, z: position.z },
      targetPosition: { x: 0, y: 0, z: 0 },
      isChasing: false,
      scale: 1,
      tiltAngle: 0,
      textureUrl: ''
    }

    this.scene.add(sprite)
    this.scene.add(mesh)
    this.entities.set(id, { state, mesh, sprite })
  }

  spawnInitialEntities(playerPosition: THREE.Vector3, count: number = 3) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const distance = 20 + Math.random() * 15
      const x = playerPosition.x + Math.cos(angle) * distance
      const z = playerPosition.z + Math.sin(angle) * distance
      this.spawnEntity(new THREE.Vector3(x, 0, z))
    }
  }

  update(
    deltaTime: number, 
    playerPosition: THREE.Vector3,
    currentTime: number
  ): { isBeingChased: boolean; damageTaken: number } {
    let isBeingChased = false
    let damageTaken = 0

    this.mutationTime += deltaTime

    // Collect ground segments dynamically for entity Y-axis adaptation
    const groundObjects = this.scene.children.filter(
      c => c instanceof THREE.Mesh && c.userData.isGround
    ) as THREE.Mesh[];

    // First pass: Update all existing entities
    this.entities.forEach(({ state, mesh, sprite }) => {
      const dx = playerPosition.x - state.position.x
      const dy = playerPosition.y - state.position.y
      const dz = playerPosition.z - state.position.z
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz) // 3D Distance

      if (distanceToPlayer > 500) {
        return
      }

      if (distanceToPlayer < this.config.entityDetectionRange) {
        state.isChasing = true
        isBeingChased = true

        // Isolate horizontal vector for pure running speed
        const horizontalDist = Math.sqrt(dx * dx + dz * dz)
        let dirX = 0, dirZ = 0
        if (horizontalDist > 0.1) {
          dirX = dx / horizontalDist
          dirZ = dz / horizontalDist
        }

        let speed = this.config.entitySpeed

        if (this.config.entityBehavior === 'creeping') {
          speed *= 0.5 + Math.sin(currentTime * 0.5) * 0.2
        } else if (this.config.entityBehavior === 'chaotic') {
          speed *= 1 + Math.sin(currentTime * 5) * 0.5
          const chaos = Math.sin(currentTime * 10 + state.position.x) * 0.3
          state.position.x += chaos * deltaTime
        }

        state.position.x += dirX * speed * deltaTime
        state.position.z += dirZ * speed * deltaTime

        // Player collision calculation (requires true 3D distance now)
        if (distanceToPlayer < 2.0) {
          if (currentTime - this.lastDamageTime > DAMAGE_COOLDOWN) {
            damageTaken = DAMAGE_AMOUNT
            this.lastDamageTime = currentTime
          }
        }
      } else {
        state.isChasing = false
        if (distanceToPlayer < 120) {
          state.position.x += (Math.random() - 0.5) * deltaTime * 2
          state.position.z += (Math.random() - 0.5) * deltaTime * 2
        }
      }

      // Physics: Smooth Y transition based on floor topology below the entity
      if (groundObjects.length > 0) {
        const raycaster = new THREE.Raycaster(
          new THREE.Vector3(state.position.x, 100, state.position.z), 
          new THREE.Vector3(0, -1, 0)
        );
        const intersects = raycaster.intersectObjects(groundObjects);
        if (intersects.length > 0) {
          const targetY = intersects[0].point.y + ENTITY_HEIGHT / 2;
          // Interpolate for smooth transition when scaling ramps
          state.position.y += (targetY - state.position.y) * 10 * deltaTime;
        }
      }

      // Goofy mode mutations
      if (this.config.entityBehavior === 'chaotic') {
        state.scale = 1 + Math.sin(this.mutationTime * 3 + parseFloat(state.id)) * 0.3
        state.tiltAngle = Math.sin(this.mutationTime * 5 + parseFloat(state.id)) * 0.3
        sprite.scale.set(
          ENTITY_HEIGHT * 0.8 * state.scale,
          ENTITY_HEIGHT * state.scale,
          1
        )
        sprite.material.rotation = state.tiltAngle
      }

      sprite.position.set(state.position.x, state.position.y, state.position.z)
      mesh.position.copy(sprite.position)
      sprite.lookAt(this.camera.position)
    })

    const entitiesToRemove: string[] = []
    this.entities.forEach(({ state }, id) => {
      const dx = playerPosition.x - state.position.x
      const dy = playerPosition.y - state.position.y
      const dz = playerPosition.z - state.position.z
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz)
      
      if (distanceToPlayer > 150) {
        entitiesToRemove.push(id)
      }
    })
    
    entitiesToRemove.forEach(id => {
      const entity = this.entities.get(id)
      if (entity) {
        this.scene.remove(entity.mesh)
        this.scene.remove(entity.sprite)
        this.entities.delete(id)
      }
    })

    const maxEntities = Math.max(8, 3 + Math.floor(Math.sqrt(currentTime)))
    
    if (this.entities.size < maxEntities && Math.random() < 0.005) {
      const angle = Math.random() * Math.PI * 2
      const distance = 40 + Math.random() * 40
      const spawnPos = new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        playerPosition.y, // Inject at the player's general floor level
        playerPosition.z + Math.sin(angle) * distance
      )
      this.spawnEntity(spawnPos)
    }

    if (this.entities.size < 3) {
      const angle = Math.random() * Math.PI * 2
      const distance = 50 + Math.random() * 30
      const spawnPos = new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        playerPosition.y,
        playerPosition.z + Math.sin(angle) * distance
      )
      this.spawnEntity(spawnPos)
    }

    return { isBeingChased, damageTaken }
  }

  getEntities(): EntityState[] {
    return Array.from(this.entities.values()).map(e => e.state)
  }

  clear() {
    this.entities.forEach(({ mesh, sprite }) => {
      this.scene.remove(mesh)
      this.scene.remove(sprite)
    })
    this.entities.clear()
  }
}
